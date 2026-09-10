/* Lossless Cocos distribution. Only exact bytes from the immutable predecessor are executable. */
(function () {
  'use strict';
  var root = new URL('./', document.baseURI), payloadHash = 'c3e87331015331f30b8a910b2983f062afb82ae906c99577c3b02bf0a9d9c0af';
  async function digest(bytes) { return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),function(b){return b.toString(16).padStart(2,'0');}).join(''); }
  async function fetchBytes(url) { var r=await fetch(new URL(url,root));if(!r.ok)throw new Error('Build resource '+r.status);return new Uint8Array(await r.arrayBuffer()); }
  function script(url) { return new Promise(function(resolve,reject){var n=document.createElement('script');n.src=url;n.onload=function(){n.remove();resolve();};n.onerror=function(){n.remove();reject(new Error('Build script unavailable'));};document.body.appendChild(n);}); }
  window.WDPlayLoadFailure = function () {
    var overlay=document.getElementById('WDCodeRecovery');if(overlay)return;
    overlay=document.createElement('div');overlay.id='WDCodeRecovery';overlay.style.cssText='position:fixed;inset:0;z-index:2147483647;background:#061e27;color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;font:18px sans-serif;gap:20px;text-align:center;padding:24px';
    var text=document.createElement('div');text.textContent='게임을 불러오지 못했습니다. 다시 시도해주세요.';var retry=document.createElement('button');retry.textContent='다시 시도';retry.style.cssText='padding:12px 28px;border-radius:12px;background:#197c7d;color:white;border:1px solid #78d9d5;font:inherit';retry.onclick=function(){location.reload();};overlay.append(text,retry);document.body.appendChild(overlay);
  };
  window.WDPlayReady = (async function () {
    var packed=await fetchBytes('play-code.bin');if(await digest(packed)!==payloadHash)throw new Error('Build payload mismatch');
    var stream=new Blob([packed]).stream().pipeThrough(new DecompressionStream('gzip')),decoded=new Uint8Array(await new Response(stream).arrayBuffer());
    if(decoded.length<4)throw new Error('Invalid build header');
    var view=new DataView(decoded.buffer),headerSize=view.getUint32(0,true),cursor=4+headerSize;
    if(cursor>decoded.length)throw new Error('Invalid build header size');
    var data=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(decoded.subarray(4,cursor)));
    if(data.schema!==1||!Number.isSafeInteger(data.bytes)||data.bytes<1||data.bytes>16000000)throw new Error('Unknown build format');
    var base=await fetchBytes(data.base);if(await digest(base)!==data.baseSha256)throw new Error('Build predecessor mismatch');
    var bytes=new Uint8Array(data.bytes),offset=0;
    while(cursor<decoded.length){
      var tag=decoded[cursor++],part,size,start;
      if(tag===0){if(cursor+8>decoded.length)throw new Error('Invalid build copy');start=view.getUint32(cursor,true);size=view.getUint32(cursor+4,true);cursor+=8;if(start+size>base.length)throw new Error('Invalid build copy length');part=base.subarray(start,start+size);}
      else if(tag===1){if(cursor+4>decoded.length)throw new Error('Invalid build literal');size=view.getUint32(cursor,true);cursor+=4;if(cursor+size>decoded.length)throw new Error('Invalid build literal length');part=decoded.subarray(cursor,cursor+size);cursor+=size;}
      else throw new Error('Invalid build operation');
      if(offset+part.length>bytes.length)throw new Error('Invalid build length');bytes.set(part,offset);offset+=part.length;
    }
    if(offset!==bytes.length||await digest(bytes)!==data.sha256)throw new Error('Build result mismatch');
    var main=URL.createObjectURL(new Blob([bytes],{type:'application/javascript'}));
    try {await script(main);}finally{URL.revokeObjectURL(main);}
    await script(new URL(data.internal,root).href);
    await script(new URL('assets/resources/index.js',root).href);
    var application=URL.createObjectURL(new Blob([data.application],{type:'application/javascript'}));
    System.set(new URL('application.js',root).href,await System.import(application));
    // Keep the application URL alive for SystemJS retries during this page's lifetime.
    window.addEventListener('pagehide',function(){URL.revokeObjectURL(application);},{once:true});
  }());
}());
