export type Observer = { lat: number; lon: number };

export type StarTuple = [ra: number, dec: number, mag: number, bv: number, nameIdx: number];

export type SkyData = {
  names: string[];
  stars: StarTuple[];
  constellations: { id: string; name: string; center: [number, number]; segs: [number, number][][] }[];
  dsos: [id: string, alt: string, ra: number, dec: number, mag: number, type: string][];
};

/** Unit vector in the local horizon frame: east, north, up. */
export type Vec3 = [e: number, n: number, u: number];

export type SkyObject = {
  kind: 'star' | 'planet' | 'sun' | 'moon' | 'dso' | 'sat';
  id: string;
  name: string;
  mag: number;
  alt: number;
  az: number;
  v: Vec3;
  color: string;
  /** Extra info line, e.g. Moon phase or DSO type. */
  detail?: string;
};

export type View = { az: number; alt: number; fov: number };
