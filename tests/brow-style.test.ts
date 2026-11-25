import {test} from 'node:test';
import assert from 'node:assert/strict';
import {BROW_STYLES,browStyleForSeed} from '../src/face/BrowStyle';

test('appearance seed gives stable brows and distributes all four approved styles',()=>{
  const counts=new Map(BROW_STYLES.map(style=>[style,0]));
  for(let seed=0;seed<1000;seed++){
    const style=browStyleForSeed(seed);
    assert.equal(style,browStyleForSeed(seed));
    counts.set(style,counts.get(style)!+1);
  }
  for(const count of counts.values())assert.ok(count>150&&count<350);
});

import {Texture} from 'three';
import fs from 'node:fs';
import {RuntimeVisual} from '../src/game/RuntimeVisual';
import {designForGame,gameplayAtlas} from '../src/game/RuntimeAppearance';
import {skinFrom} from '../src/core/skin';
test('ordinary runtime characters use V5, preserve brows through reactions and skull removal',()=>{
 const atlas=gameplayAtlas(JSON.parse(fs.readFileSync('public/assets/face/animated/atlas.json','utf8')));
 for(const seed of [1,21,42,100]){
  const skin=skinFrom(seed),visual=new RuntimeVisual({...designForGame(skin),pattern:'none',surface:'segments',growthCount:0},atlas,[new Texture(),new Texture(),new Texture()],skin.mood);
  const face=visual.face.experimentalFace!;
  assert.ok(face?.visible);assert.equal(visual.face.rig.visible,false);
  assert.equal(face.browStyle,browStyleForSeed(seed));
  for(const reaction of ['happy','fury','scared','dazed']){visual.face.play(reaction);visual.face.update(.1,.4);assert.equal(face.browStyle,browStyleForSeed(seed));}
  visual.face.setSkull(true);visual.face.setSkull(false);
  assert.equal(face.visible,true);assert.equal(face.browStyle,browStyleForSeed(seed));
  visual.dispose();
 }
});
