import {
  TextureLoader,
  SRGBColorSpace,
  LinearFilter,
  type Texture,
} from "three";
export interface FaceAtlas {
  texture: Texture;
  width: number;
  height: number;
  eyes: number[][];
  brows: number[][];
  mouths: number[][];
}
export async function loadFaceAtlas(): Promise<FaceAtlas> {
  const base = import.meta.env.BASE_URL + "assets/face/";
  const response = await fetch(base + "features-v03.json");
  if (!response.ok) throw Error("Face metadata unavailable");
  const data = await response.json();
  const texture = await new TextureLoader().loadAsync(
    base + "features-v03.png",
  );
  texture.colorSpace = SRGBColorSpace;
  texture.minFilter = LinearFilter;
  texture.magFilter = LinearFilter;
  texture.generateMipmaps = false;
  return { ...data, texture };
}
