import 'server-only';
import sharp from 'sharp';
import {ServiceError} from '@/server/result';
export const MAX_IMAGE_BYTES=2*1024*1024;
export async function sanitizeImage(bytes:Buffer){
 if(!bytes.length||bytes.length>MAX_IMAGE_BYTES)throw new ServiceError('validation','Choose an image under 2 MB.');
 try{
  const input=sharp(bytes,{limitInputPixels:16_000_000,animated:true,failOn:'warning'});
  const meta=await input.metadata();
  if(!['png','jpeg','webp','gif'].includes(meta.format??'')||!meta.width||!meta.height||(meta.pages??1)>40||meta.width*meta.height>16_000_000)throw Error('Unsupported image');
  // Decode/re-encode instead of trusting extensions, client MIME or embedded metadata.
  const {data,info}=await input.rotate().webp({quality:85,effort:3}).toBuffer({resolveWithObject:true});
  if(data.length>MAX_IMAGE_BYTES)throw Error('Image too large');
  return {bytes:data,width:info.width,height:info.height};
 }catch{throw new ServiceError('validation','Choose a valid PNG, JPEG, WebP or GIF under 2 MB and 16 megapixels.');}
}
