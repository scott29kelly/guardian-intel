#!/usr/bin/env python3
"""
NotebookLM Bridge for Guardian Intel Deck Generation

Bridges the TypeScript deck generation pipeline to NotebookLM's Python API.
Accepts customer context as JSON via stdin, creates/reuses a NotebookLM notebook,
generates deep research and slide deck content, and outputs structured JSON to stdout.

Usage:
  echo '{"action":"generate","customer":{...}}' | python3 scripts/notebooklm-bridge.py

Actions:
  - generate: Full pipeline — create notebook, add sources, research, generate slides
  - research: Research-only — returns deep insights without slide structure
  - cleanup: Delete a notebook by ID

Environment:
  - NOTEBOOKLM_STORAGE_PATH: Path to NotebookLM credentials (default: ~/.notebooklm)
"""

import asyncio
import json
import os
import sys
import tempfile
from pathlib import Path
from typing import Any

from notebooklm import (
    NotebookLMClient,
    ChatMode,
    ChatResponseLength,
)
from notebooklm.types import SlideDeckFormat, SlideDeckLength


# =============================================================================
# Constants
# =============================================================================

GUARDIAN_NOTEBOOK_PREFIX = "Guardian Intel - "

# Slide section IDs that map to the TypeScript deck generator
SLIDE_SECTIONS = [
    "customer-overview",
    "talking-points",
    "objection-handling",
    "storm-exposure",
    "recommended-actions",
    "property-intel",
]

# Research prompts for each section — these are what make NotebookLM shine
RESEARCH_PROMPTS: dict[str, str] = {
    "customer-overview": """Analyze this customer's complete profile and generate a strategic overview.
Return a JSON object with this structure:
{
  "title": "Compelling headline summarizing the customer opportunity",
  "stats": [
    {
      "label": "Short label (2-4 words)",
      "value": "Display value with units",
      "insight": "1-sentence strategic insight for the sales rep",
      "icon": "Target|Home|Calendar|Zap|DollarSign|Shield|TrendingUp|AlertTriangle"
    }
  ],
  "bottomLine": "1-sentence summary of biggest opportunity or risk"
}

Generate exactly 4 stats. Be strategic — provide INSIGHTS, not just data. Consider:
- Roof lifecycle position and replacement probability
- Storm history correlation with damage likelihood
- Insurance claim opportunity assessment
- Competitive positioning based on property value and market""",

    "talking-points": """You are a top-performing roofing sales coach. Create a PERSONALIZED call script
for this specific customer based on everything in the sources.

Return a JSON object:
{
  "title": "Personalized talking points title",
  "points": [
    {
      "topic": "Topic name",
      "script": "EXACT words to say — conversational, natural, uses customer's first name",
      "priority": "high|medium|low",
      "timing": "When to use (Opening, After objection, Closing, etc.)"
    }
  ],
  "keyInsight": "The #1 thing this rep needs to know about this customer"
}

Requirements:
- Use customer's FIRST NAME in scripts
- Reference SPECIFIC storms with dates if available
- Reference SPECIFIC property details (roof age, type, square footage)
- Create urgency from actual data
- Include insurance-specific angles if carrier is known
- At least 6 talking points
- Sound natural, not robotic — these are real conversations""",

    "objection-handling": """Predict the MOST LIKELY objections this specific homeowner will raise
based on their full profile, and provide tailored responses.

Return a JSON object:
{
  "title": "Handling [FirstName]'s Concerns",
  "items": [
    {
      "objection": "The exact objection they'll say",
      "response": "Personalized response using their specific data",
      "followUp": "A question to ask after your response",
      "priority": "high|medium|low"
    }
  ],
  "proactiveTip": "Something to say BEFORE they object to prevent it"
}

Personalize based on data:
- High deductible ($2500+): "I can't afford it" — address payment options
- Newer roof (<10 years): "I don't need a new roof" — focus on inspection/repair
- No recent storms: "Why now?" — focus on prevention and wear/tear
- Unknown insurance: "Insurance won't cover it" — explain claim process
- High property value: Quality and warranty concerns""",

    "storm-exposure": """Analyze this homeowner's complete storm exposure history to identify
sales opportunities and risk assessment.

Return a JSON object:
{
  "title": "Storm Analysis: [LastName] Property",
  "events": [
    {
      "date": "Formatted date",
      "title": "Storm type with strategic note",
      "description": "What this means for the roof",
      "status": "completed|current|upcoming",
      "damageRisk": "high|medium|low",
      "opportunity": "Why this matters for the sale"
    }
  ],
  "summary": {
    "totalEvents": 0,
    "highRiskEvents": 0,
    "claimOpportunity": "Assessment of unclaimed insurance opportunity",
    "urgencyLevel": "Critical|High|Medium|Low",
    "recommendation": "What the rep should do with this information"
  }
}

Focus on SALES RELEVANCE:
- Hail 1"+ = likely roof damage, claim opportunity
- Wind 60+ mph = possible damage, worth inspection
- Multiple events = cumulative damage argument
- No claims filed after major storms = money left on table
- Consider roof age interaction with storm severity""",

    "recommended-actions": """Create a SPECIFIC, prioritized action plan for closing this customer
based on their stage, scores, history, and profile.

Return a JSON object:
{
  "title": "Action Plan: [FirstName] [LastName]",
  "items": [
    {
      "action": "Specific action to take",
      "timing": "When to do it (Today, Within 24h, This week)",
      "script": "What to say or do",
      "icon": "Calendar|Phone|FileText|CheckCircle|MapPin|Shield",
      "priority": "high|medium|low"
    }
  ],
  "primaryGoal": "The single most important outcome to achieve",
  "fallbackPlan": "What to do if primary approach doesn't work"
}

Base actions on customer STAGE:
- New/Contacted: Schedule inspection
- Qualified: Proposal and urgency
- Proposal: Follow-up and closing
- Negotiation: Overcome final objections""",

    "property-intel": """Generate a comprehensive property intelligence assessment combining
all available data about this property.

Return a JSON object:
{
  "title": "Property Intelligence: [Address]",
  "highlights": [
    {
      "label": "Category (e.g., Roof Condition, Storm Risk, Market Position)",
      "value": "Key finding",
      "detail": "Supporting analysis",
      "risk": "high|medium|low"
    }
  ],
  "marketContext": "How this property compares to typical properties in the area",
  "repAdvice": "What the rep should focus on during the inspection"
}""",
}


# =============================================================================
# Customer Context Builder
# =============================================================================

def build_customer_markdown(data: dict[str, Any]) -> str:
    """Convert customer JSON into rich markdown for NotebookLM source ingestion."""
    customer = data.get("customer", {})
    weather_events = data.get("weatherEvents", [])
    intel_items = data.get("intelItems", [])

    name = f"{customer.get('firstName', '')} {customer.get('lastName', '')}".strip()
    address = customer.get("address", "Unknown")
    city = customer.get("city", "Unknown")
    state = customer.get("state", "Unknown")

    md = f"""# Complete Customer Intelligence Brief: {name}

## Customer Profile
- **Full Name:** {name}
- **Address:** {address}
- **City/State:** {city}, {state}
- **ZIP Code:** {customer.get("zipCode", "Unknown")}
- **Email:** {customer.get("email", "Not provided")}
- **Phone:** {customer.get("phone", "Not provided")}

## Property Details
- **Property Type:** {customer.get("propertyType", "Residential")}
- **Year Built:** {customer.get("yearBuilt", "Unknown")}
- **Square Footage:** {f'{customer["squareFootage"]:,}' if customer.get("squareFootage") else "Unknown"} sq ft
- **Property Value:** {f'${customer["propertyValue"]:,}' if customer.get("propertyValue") else "Unknown"}

## Roof Information
- **Roof Type:** {customer.get("roofType", "Unknown")}
- **Roof Age:** {customer.get("roofAge", "Unknown")} years
- **Condition Assessment:** {"Near end of lifespan — prime replacement candidate" if customer.get("roofAge", 0) and customer["roofAge"] > 18 else "Mid-life — monitor and maintain" if customer.get("roofAge", 0) and customer["roofAge"] > 10 else "Relatively new — focus on storm damage"}

## Insurance Information
- **Carrier:** {customer.get("insuranceCarrier", "Unknown")}
- **Policy Type:** {customer.get("policyType", "Unknown")}
- **Deductible:** {f'${customer["deductible"]:,}' if customer.get("deductible") else "Unknown"}
- **Deductible Analysis:** {"HIGH deductible — homeowner may hesitate on out-of-pocket costs, emphasize insurance claim process" if customer.get("deductible", 0) and customer["deductible"] >= 2500 else "Standard deductible — manageable for most homeowners" if customer.get("deductible", 0) and customer["deductible"] >= 1000 else "Low deductible — favorable for insurance claim path"}

## Lead Intelligence Scores
- **Lead Score:** {customer.get("leadScore", "Unknown")}/100
- **Urgency Score:** {customer.get("urgencyScore", "Unknown")}/100
- **Current Stage:** {customer.get("stage", "Unknown")}
- **Status:** {customer.get("status", "Unknown")}
- **Lead Source:** {customer.get("leadSource", "Unknown")}
- **Assigned Rep:** {customer.get("assignedRep", {}).get("name", "Unassigned") if isinstance(customer.get("assignedRep"), dict) else "Unassigned"}

## Profit Analysis
- **Estimated Profit Potential:** Based on {f'{customer["squareFootage"]:,}' if customer.get("squareFootage") else "standard"} sq ft property
- **Material Recommendation:** {"Premium materials justified" if customer.get("propertyValue", 0) and customer["propertyValue"] > 300000 else "Standard materials appropriate"}

## Weather Event History
"""

    if weather_events:
        md += f"**Total Events:** {len(weather_events)}\n\n"
        for i, event in enumerate(weather_events, 1):
            md += f"""### Event {i}: {event.get("eventType", "Unknown")}
- **Date:** {event.get("eventDate", "Unknown")}
- **Severity:** {event.get("severity", "Unknown")}
- **Hail Size:** {f'{event["hailSize"]}" diameter' if event.get("hailSize") else "Not recorded"}
- **Wind Speed:** {f'{event["windSpeed"]} mph' if event.get("windSpeed") else "Not recorded"}
- **Damage Reported:** {"Yes — ACTIVE OPPORTUNITY" if event.get("damageReported") else "No — potential hidden damage"}
- **Claim Filed:** {"Yes" if event.get("claimFiled") else "No — UNCLAIMED INSURANCE OPPORTUNITY"}

"""
    else:
        md += "No storm events on record. Focus on preventive maintenance and roof age.\n\n"

    if intel_items:
        md += "## Key Intelligence Items\n\n"
        for item in intel_items:
            md += f"""### {item.get("title", "Intel Item")}
{item.get("content", "")}
*Priority: {item.get("priority", "medium")}*

"""

    md += f"""## Sales Strategy Guidance

### Based on Scores
{"- **HIGH URGENCY** — This customer has time-sensitive circumstances. Act fast." if customer.get("urgencyScore", 0) and customer["urgencyScore"] > 70 else ""}
{"- **HIGH LEAD SCORE** — Strong conversion probability. Push for close." if customer.get("leadScore", 0) and customer["leadScore"] > 75 else ""}
{"- **LOW URGENCY + HIGH LEAD** — Good prospect but needs activation. Create urgency." if customer.get("urgencyScore", 0) and customer["urgencyScore"] < 50 and customer.get("leadScore", 0) and customer["leadScore"] > 60 else ""}

### Based on Roof Age
{"- Roof is **" + str(customer.get("roofAge", 0)) + " years old** — near or past typical lifespan. Lead with replacement timeline." if customer.get("roofAge", 0) and customer["roofAge"] > 15 else ""}
{"- Roof is **relatively new** — focus on storm damage assessment rather than age-based replacement." if customer.get("roofAge", 0) and customer["roofAge"] < 10 else ""}

### Based on Insurance
{"- Carrier is **" + str(customer.get("insuranceCarrier", "")) + "** — reference their specific claim process." if customer.get("insuranceCarrier") else "- Insurance carrier unknown — educate on general claim process."}

---
*Intelligence brief generated: {__import__("datetime").datetime.now().isoformat()}*
*Customer ID: {customer.get("id", "unknown")}*
"""
    return md


# =============================================================================
# NotebookLM Operations
# =============================================================================

async def create_or_get_notebook(
    client: NotebookLMClient,
    customer_name: str,
    notebook_id: str | None = None,
) -> str:
    """Create a new notebook for this customer or reuse an existing one."""
    if notebook_id:
        try:
            notebooks = await client.notebooks.list()
            for nb in notebooks:
                if nb.id == notebook_id:
                    return notebook_id
        except Exception:
            pass

    # Create new notebook
    notebook_name = f"{GUARDIAN_NOTEBOOK_PREFIX}{customer_name}"
    nb = await client.notebooks.create(notebook_name)
    return nb.id


async def add_customer_source(
    client: NotebookLMClient,
    notebook_id: str,
    customer_data: dict[str, Any],
) -> None:
    """Add customer context as a text source to the notebook."""
    markdown_content = build_customer_markdown(customer_data)

    # Write to temp file for source upload
    customer_name = f"{customer_data.get('customer', {}).get('firstName', 'Customer')} {customer_data.get('customer', {}).get('lastName', '')}".strip()

    with tempfile.NamedTemporaryFile(
        mode="w",
        suffix=".md",
        prefix=f"guardian-{customer_name.replace(' ', '-')}-",
        delete=False,
    ) as f:
        f.write(markdown_content)
        temp_path = f.name

    try:
        await client.sources.add_file(
            notebook_id,
            temp_path,
            wait=True,
        )
    finally:
        Path(temp_path).unlink(missing_ok=True)


async def research_section(
    client: NotebookLMClient,
    notebook_id: str,
    section_id: str,
    customer_data: dict[str, Any],
) -> dict[str, Any]:
    """Use NotebookLM chat to research a specific slide section."""
    prompt_template = RESEARCH_PROMPTS.get(section_id)
    if not prompt_template:
        return {}

    # Personalize the prompt
    customer = customer_data.get("customer", {})
    first_name = customer.get("firstName", "Customer")
    last_name = customer.get("lastName", "")
    address = customer.get("address", "Property")

    prompt = prompt_template.replace("[FirstName]", first_name)
    prompt = prompt.replace("[LastName]", last_name)
    prompt = prompt.replace("[Address]", address)

    # Wrap with JSON instruction
    full_prompt = f"""{prompt}

IMPORTANT: Return ONLY valid JSON. No markdown code fences, no explanatory text.
Just the raw JSON object."""

    try:
        result = await client.chat.ask(
            notebook_id,
            full_prompt,
            mode=ChatMode.DETAILED,
            response_length=ChatResponseLength.LONGER,
        )

        # Parse JSON from response
        answer = result.answer.strip()

        # Strip markdown code fences if present
        if answer.startswith("```"):
            lines = answer.split("\n")
            # Remove first and last lines (code fences)
            lines = [l for l in lines if not l.strip().startswith("```")]
            answer = "\n".join(lines).strip()

        return json.loads(answer)

    except json.JSONDecodeError as e:
        log_error(f"Failed to parse JSON for section {section_id}: {e}")
        return {"error": f"JSON parse error: {str(e)}", "raw": answer if "answer" in dir() else ""}
    except Exception as e:
        log_error(f"Research failed for section {section_id}: {e}")
        return {"error": str(e)}


async def generate_slide_deck_artifact(
    client: NotebookLMClient,
    notebook_id: str,
) -> dict[str, Any] | None:
    """Generate a slide deck artifact via NotebookLM's artifact system."""
    try:
        status = await client.artifacts.generate_slide_deck(
            notebook_id,
            instructions="Create a professional roofing sales presentation. Focus on customer-specific insights, storm damage analysis, insurance claim opportunities, and clear next steps. Make it compelling and data-driven.",
            length=SlideDeckLength.DEFAULT,
            format=SlideDeckFormat.DETAILED_DECK,
        )

        # Wait for completion
        await client.artifacts.wait_for_completion(notebook_id, status.task_id)

        # Download as JSON structure
        with tempfile.NamedTemporaryFile(
            suffix=".json", delete=False, mode="w"
        ) as f:
            temp_path = f.name

        await client.artifacts.download_slide_deck(
            notebook_id,
            temp_path,
        )

        with open(temp_path) as f:
            deck_data = json.load(f)

        Path(temp_path).unlink(missing_ok=True)
        return deck_data

    except Exception as e:
        log_error(f"Slide deck artifact generation failed: {e}")
        return None


# =============================================================================
# Main Pipeline
# =============================================================================

async def run_generate(data: dict[str, Any]) -> dict[str, Any]:
    """Full generation pipeline: notebook → sources → research → slides."""
    customer_data = data
    customer = customer_data.get("customer", {})
    customer_name = f"{customer.get('firstName', 'Customer')} {customer.get('lastName', '')}".strip()
    notebook_id = data.get("notebookId")
    sections_requested = data.get("sections", SLIDE_SECTIONS)

    async with await NotebookLMClient.from_storage() as client:
        # Step 1: Create or reuse notebook
        nb_id = await create_or_get_notebook(client, customer_name, notebook_id)
        log_progress("notebook_created", {"notebookId": nb_id})

        # Step 2: Add customer context as source
        await add_customer_source(client, nb_id, customer_data)
        log_progress("source_added", {"notebookId": nb_id})

        # Step 3: Research each section via chat
        section_results: dict[str, Any] = {}
        for section_id in sections_requested:
            if section_id in RESEARCH_PROMPTS:
                log_progress("researching", {"section": section_id})
                result = await research_section(client, nb_id, section_id, customer_data)
                section_results[section_id] = result

        # Step 4: Try to generate a slide deck artifact for structure
        log_progress("generating_artifact", {})
        deck_artifact = await generate_slide_deck_artifact(client, nb_id)

        return {
            "success": True,
            "notebookId": nb_id,
            "sections": section_results,
            "deckArtifact": deck_artifact,
            "customerName": customer_name,
        }


async def run_research(data: dict[str, Any]) -> dict[str, Any]:
    """Research-only mode: returns deep insights without slide generation."""
    customer_data = data
    customer = customer_data.get("customer", {})
    customer_name = f"{customer.get('firstName', 'Customer')} {customer.get('lastName', '')}".strip()
    notebook_id = data.get("notebookId")
    sections_requested = data.get("sections", SLIDE_SECTIONS)

    async with await NotebookLMClient.from_storage() as client:
        nb_id = await create_or_get_notebook(client, customer_name, notebook_id)
        await add_customer_source(client, nb_id, customer_data)

        section_results: dict[str, Any] = {}
        for section_id in sections_requested:
            if section_id in RESEARCH_PROMPTS:
                result = await research_section(client, nb_id, section_id, customer_data)
                section_results[section_id] = result

        return {
            "success": True,
            "notebookId": nb_id,
            "sections": section_results,
            "customerName": customer_name,
        }


async def run_cleanup(data: dict[str, Any]) -> dict[str, Any]:
    """Delete a notebook by ID."""
    notebook_id = data.get("notebookId")
    if not notebook_id:
        return {"success": False, "error": "notebookId required"}

    async with await NotebookLMClient.from_storage() as client:
        await client.notebooks.delete(notebook_id)
        return {"success": True, "notebookId": notebook_id, "deleted": True}


# =============================================================================
# Helpers
# =============================================================================

def log_progress(stage: str, data: dict[str, Any]) -> None:
    """Write progress updates to stderr (stdout is reserved for JSON output)."""
    msg = json.dumps({"type": "progress", "stage": stage, **data})
    print(msg, file=sys.stderr, flush=True)


def log_error(message: str) -> None:
    """Write error messages to stderr."""
    msg = json.dumps({"type": "error", "message": message})
    print(msg, file=sys.stderr, flush=True)


# =============================================================================
# Entry Point
# =============================================================================

async def main() -> None:
    """Read JSON from stdin, execute action, write JSON to stdout."""
    try:
        raw_input = sys.stdin.read()
        data = json.loads(raw_input)
    except json.JSONDecodeError as e:
        print(json.dumps({"success": False, "error": f"Invalid JSON input: {e}"}))
        sys.exit(1)

    action = data.get("action", "generate")

    try:
        if action == "generate":
            result = await run_generate(data)
        elif action == "research":
            result = await run_research(data)
        elif action == "cleanup":
            result = await run_cleanup(data)
        else:
            result = {"success": False, "error": f"Unknown action: {action}"}

        print(json.dumps(result, default=str))

    except Exception as e:
        print(json.dumps({
            "success": False,
            "error": str(e),
            "errorType": type(e).__name__,
        }))
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
