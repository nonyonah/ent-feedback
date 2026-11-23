import {test} from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {sanitizeImage} from '../src/server/image-validation';

test('changelog image pipeline decodes PNG images and strips metadata',async()=>{
  const bytes=await sharp({create:{width:8,height:8,channels:4,background:'red'}}).png().toBuffer();
  const result=await sanitizeImage(bytes);
  const metadata=await sharp(result.bytes).metadata();
  assert.equal(metadata.format,'webp');
  assert.equal(metadata.width,8);
  assert.equal(metadata.height,8);
  assert.equal(metadata.exif,undefined);
});

test('GIF uploads retain their animation after sanitization',async()=>{
  const pixels=Buffer.alloc(4*8*4);
  for(let index=0;index<32;index++){
    pixels[index*4+(index<16?0:2)]=255;
    pixels[index*4+3]=255;
  }
  const gif=await sharp(pixels,{raw:{width:4,height:8,channels:4,pageHeight:4}}).gif({delay:[100,100],loop:0}).toBuffer();
  assert.equal((await sharp(gif,{animated:true}).metadata()).pages,2);
  const result=await sanitizeImage(gif);
  const metadata=await sharp(result.bytes,{animated:true}).metadata();
  assert.equal(metadata.format,'webp');
  assert.equal(metadata.pages,2);
});

test('invalid and oversized image uploads are rejected',async()=>{
  await assert.rejects(()=>sanitizeImage(Buffer.from('<svg onload="alert(1)"></svg>')));
  await assert.rejects(()=>sanitizeImage(Buffer.alloc(2*1024*1024+1)));
});
