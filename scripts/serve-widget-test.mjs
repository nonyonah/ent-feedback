import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
const page=new URL('../examples/widget-test/index.html',import.meta.url);
const port=Number(process.env.WIDGET_TEST_PORT??3333);
createServer(async(request,response)=>{
 if(request.url!=='/'&&request.url!=='/index.html'){response.writeHead(404);response.end('Not found');return;}
 try{response.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});response.end(await readFile(page));}
 catch{response.writeHead(500);response.end('Test page could not be loaded.');}
}).listen(port,'127.0.0.1',()=>console.log(`Widget test page: http://localhost:${port}`));
