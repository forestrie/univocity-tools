export type Artifact = {
  id: number;
  name: string;
  size_in_bytes: number;
  expired: boolean;
};

export type ArtifactList = {
  total_count: number;
  artifacts: Artifact[];
};
