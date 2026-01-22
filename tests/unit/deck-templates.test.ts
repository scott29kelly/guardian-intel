/**
 * Deck Generator Template Unit Tests
 *
 * Tests that deck templates are properly structured and meet requirements
 */

import { describe, it, expect } from "vitest";
import { customerCheatSheetTemplate } from "../../src/features/deck-generator/templates/customer-cheat-sheet";
import {
  deckTemplates,
  getTemplateById,
  getTemplatesByAudience,
  getTemplatesByCategory,
} from "../../src/features/deck-generator/templates";
import type { DeckTemplate, SlideSection } from "../../src/features/deck-generator/types/deck.types";

describe("Customer Cheat Sheet Template", () => {
  const template = customerCheatSheetTemplate;

  describe("Template Metadata", () => {
    it("should have correct id and name", () => {
      expect(template.id).toBe("customer-cheat-sheet");
      expect(template.name).toBe("Customer Interaction Prep");
    });

    it("should have a description", () => {
      expect(template.description).toBeDefined();
      expect(template.description.length).toBeGreaterThan(0);
    });

    it("should target sales reps", () => {
      expect(template.audience).toBe("rep");
    });

    it("should be in sales category", () => {
      expect(template.category).toBe("sales");
    });

    it("should have appropriate tags", () => {
      expect(template.tags).toContain("sales");
      expect(template.tags).toContain("customer-prep");
    });

    it("should have an icon specified", () => {
      expect(template.icon).toBe("UserCircle");
    });

    it("should have estimated generation metrics", () => {
      expect(template.estimatedSlides).toBeGreaterThan(0);
      expect(template.estimatedGenerationTime).toBeGreaterThan(0);
    });
  });

  describe("Required Context", () => {
    it("should require customer context", () => {
      expect(template.requiredContext).toHaveLength(1);
      expect(template.requiredContext[0].type).toBe("customer");
      expect(template.requiredContext[0].required).toBe(true);
    });
  });

  describe("Sections", () => {
    it("should have 7 sections", () => {
      expect(template.sections).toHaveLength(7);
    });

    it("should have required sections in correct order", () => {
      const sectionIds = template.sections.map((s) => s.id);
      expect(sectionIds).toEqual([
        "title",
        "customer-overview",
        "property-intel",
        "storm-history",
        "talking-points",
        "objection-handlers",
        "next-steps",
      ]);
    });

    describe("Title Section", () => {
      const section = template.sections.find((s) => s.id === "title")!;

      it("should be a title slide type", () => {
        expect(section.type).toBe("title");
      });

      it("should not be optional", () => {
        expect(section.optional).toBe(false);
      });

      it("should not be AI enhanced", () => {
        expect(section.aiEnhanced).toBe(false);
      });

      it("should have a data source", () => {
        expect(section.dataSource).toBe("getCustomerTitleData");
      });
    });

    describe("Customer Overview Section", () => {
      const section = template.sections.find((s) => s.id === "customer-overview")!;

      it("should be a stats slide type", () => {
        expect(section.type).toBe("stats");
      });

      it("should not be optional", () => {
        expect(section.optional).toBe(false);
      });

      it("should have correct data source", () => {
        expect(section.dataSource).toBe("getCustomerOverviewStats");
      });
    });

    describe("Property Intel Section", () => {
      const section = template.sections.find((s) => s.id === "property-intel")!;

      it("should be an image slide type", () => {
        expect(section.type).toBe("image");
      });

      it("should not be optional", () => {
        expect(section.optional).toBe(false);
      });

      it("should have correct data source", () => {
        expect(section.dataSource).toBe("getPropertyIntelData");
      });
    });

    describe("Storm History Section", () => {
      const section = template.sections.find((s) => s.id === "storm-history")!;

      it("should be a timeline slide type", () => {
        expect(section.type).toBe("timeline");
      });

      it("should be optional", () => {
        expect(section.optional).toBe(true);
      });

      it("should have correct data source", () => {
        expect(section.dataSource).toBe("getStormHistoryTimeline");
      });
    });

    describe("AI-Enhanced Sections", () => {
      it("should have talking-points as AI enhanced", () => {
        const section = template.sections.find((s) => s.id === "talking-points")!;
        expect(section.aiEnhanced).toBe(true);
        expect(section.type).toBe("talking-points");
        expect(section.dataSource).toBe("generateCustomerTalkingPoints");
      });

      it("should have objection-handlers as AI enhanced", () => {
        const section = template.sections.find((s) => s.id === "objection-handlers")!;
        expect(section.aiEnhanced).toBe(true);
        expect(section.type).toBe("list");
        expect(section.dataSource).toBe("generateObjectionHandlers");
      });

      it("should have next-steps as AI enhanced and optional", () => {
        const section = template.sections.find((s) => s.id === "next-steps")!;
        expect(section.aiEnhanced).toBe(true);
        expect(section.optional).toBe(true);
        expect(section.defaultEnabled).toBe(false);
      });
    });

    it("should have all sections with valid data sources", () => {
      template.sections.forEach((section) => {
        expect(section.dataSource).toBeDefined();
        expect(section.dataSource.length).toBeGreaterThan(0);
      });
    });

    it("should have all sections with descriptions", () => {
      template.sections.forEach((section) => {
        expect(section.description).toBeDefined();
      });
    });
  });

  describe("Branding", () => {
    it("should have branding configuration", () => {
      expect(template.branding).toBeDefined();
    });

    it("should have Guardian brand colors", () => {
      expect(template.branding.colors.primary).toBe("#1E3A5F"); // Navy
      expect(template.branding.colors.secondary).toBe("#D4A656"); // Gold
      expect(template.branding.colors.accent).toBe("#4A90A4"); // Teal
    });

    it("should have fonts defined", () => {
      expect(template.branding.fonts.heading).toBeDefined();
      expect(template.branding.fonts.body).toBeDefined();
    });
  });
});

describe("Templates Index", () => {
  describe("deckTemplates array", () => {
    it("should include customer cheat sheet template", () => {
      const found = deckTemplates.find((t) => t.id === "customer-cheat-sheet");
      expect(found).toBeDefined();
    });

    it("should have unique template IDs", () => {
      const ids = deckTemplates.map((t) => t.id);
      const uniqueIds = [...new Set(ids)];
      expect(ids.length).toBe(uniqueIds.length);
    });
  });

  describe("Helper Functions", () => {
    it("getTemplateById should find customer-cheat-sheet", () => {
      const template = getTemplateById("customer-cheat-sheet");
      expect(template).toBeDefined();
      expect(template?.id).toBe("customer-cheat-sheet");
    });

    it("getTemplateById should return undefined for non-existent template", () => {
      const template = getTemplateById("non-existent");
      expect(template).toBeUndefined();
    });

    it("getTemplatesByAudience should return rep templates", () => {
      const templates = getTemplatesByAudience("rep");
      expect(templates.length).toBeGreaterThan(0);
      templates.forEach((t) => {
        expect(t.audience).toBe("rep");
      });
    });

    it("getTemplatesByCategory should return sales templates", () => {
      const templates = getTemplatesByCategory("sales");
      expect(templates.length).toBeGreaterThan(0);
      templates.forEach((t) => {
        expect(t.category).toBe("sales");
      });
    });
  });
});

describe("Template Structure Validation", () => {
  it("all templates should have required fields", () => {
    deckTemplates.forEach((template) => {
      expect(template.id).toBeDefined();
      expect(template.name).toBeDefined();
      expect(template.description).toBeDefined();
      expect(template.audience).toBeDefined();
      expect(template.sections).toBeDefined();
      expect(template.sections.length).toBeGreaterThan(0);
      expect(template.branding).toBeDefined();
      expect(template.tags).toBeDefined();
      expect(template.category).toBeDefined();
    });
  });

  it("all sections should have required fields", () => {
    deckTemplates.forEach((template) => {
      template.sections.forEach((section) => {
        expect(section.id).toBeDefined();
        expect(section.title).toBeDefined();
        expect(section.type).toBeDefined();
        expect(section.dataSource).toBeDefined();
        expect(typeof section.optional).toBe("boolean");
        expect(typeof section.aiEnhanced).toBe("boolean");
      });
    });
  });
});
