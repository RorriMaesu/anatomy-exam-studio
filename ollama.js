export function localEndpoint(raw){
  let url;try{url=new URL(raw);}catch{throw new Error('Enter a local address such as http://localhost:11434.');}
  if(!['localhost','127.0.0.1','[::1]'].includes(url.hostname)||!['http:','https:'].includes(url.protocol)||url.username||url.password||url.search||url.hash||!['','/'].includes(url.pathname))throw new Error('Use a loopback address on this computer. Remote servers and credentials are not supported.');
  return url.origin;
}
export async function listModels(endpoint,fetcher=fetch){
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),7000);
  try{
    const r=await fetcher(localEndpoint(endpoint)+'/api/tags',{signal:controller.signal,credentials:'omit',cache:'no-store'});
    if(!r.ok)throw new Error(r.status===403?'Ollama rejected this website origin. Follow the connection setup below.':`Ollama returned HTTP ${r.status}.`);
    const data=await r.json();if(!Array.isArray(data.models))throw new Error('This address did not return an Ollama model list.');
    return data.models.filter(m=>typeof m.name==='string'&&!m.name.endsWith(':cloud')&&!m.remote_host&&!m.remote_model&&Number(m.size)>0).map(m=>({name:m.name,size:m.size,parameters:m.details?.parameter_size||''}));
  }finally{clearTimeout(timer);}
}
export async function streamChat({endpoint,model,messages,onToken,signal},fetcher=fetch){
  const r=await fetcher(localEndpoint(endpoint)+'/api/chat',{method:'POST',credentials:'omit',headers:{'Content-Type':'application/json'},body:JSON.stringify({model,messages,stream:true,options:{temperature:.25,num_predict:900}}),signal});
  if(!r.ok){let message='';try{message=(await r.json()).error||'';}catch{}throw new Error(message||`Ollama returned HTTP ${r.status}.`);}
  if(!r.body)throw new Error('No response stream was returned by Ollama.');
  const reader=r.body.getReader(),decoder=new TextDecoder();let buffer='',result='',finished=false;
  function consume(line){
    if(!line.trim())return;
    const part=JSON.parse(line);if(part.error)throw new Error(part.error);
    const content=part.message?.content||'';
    if(content){result+=content;if(result.length>40000)throw new Error('The model response exceeded the size limit.');onToken(result);}
    if(part.done)finished=true;
  }
  try{
    while(true){const {value,done}=await reader.read();if(done)break;buffer+=decoder.decode(value,{stream:true});let end;while((end=buffer.indexOf('\n'))>=0){consume(buffer.slice(0,end));buffer=buffer.slice(end+1);}if(buffer.length>500000)throw new Error('The model sent an oversized stream fragment.');}
    buffer+=decoder.decode();if(buffer.trim())consume(buffer);
    if(!finished)throw new Error('The model connection ended before completion.');
    if(!result.trim())throw new Error('This model returned no chat text. Try a model that supports text chat.');
    return result;
  }finally{await reader.cancel().catch(()=>{});}
}
