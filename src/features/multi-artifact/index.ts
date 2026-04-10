/**
 * Multi-Artifact Feature Barrel Export
 *
 * Re-exports all public types, constants, and utilities for the multi-artifact
 * feature. Consumers import from "@/features/multi-artifact" rather than
 * reaching into subdirectories.
 */

export * from "./types/artifact-ui.types";
export { CustomerArtifactsPanel } from "./components/CustomerArtifactsPanel";
export { ArtifactCard } from "./components/ArtifactCard";
export { ArtifactViewerModal } from "./components/ArtifactViewerModal";
export { AudioBriefingPlayer } from "./components/AudioBriefingPlayer";
export { ReportViewer } from "./components/ReportViewer";
export { GenerateArtifactsButton } from "./components/GenerateArtifactsButton";
