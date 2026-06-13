export type ReleaseAsset = {
  id: number;
  name: string;
  url: string;
  browser_download_url: string;
};

export type Release = {
  id: number;
  tag_name: string;
  name: string;
  assets: ReleaseAsset[];
};
