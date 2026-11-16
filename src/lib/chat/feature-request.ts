// Explicit request wording only. This does not use an AI model or create posts.
export function featureRequestSuggestion(body:string):{title:string;description:string}|null{
 const text=body.trim();
 if(text.length<12||/\b(?:do not|don't|not a|no new)\s+(?:add|want|need|feature|request)\b/i.test(text))return null;
 const request=/\b(?:please (?:add|support|build|include)|(?:could|can|would) you (?:please )?(?:add|support|build|include)|(?:i|we)(?:'d| would) (?:really )?love (?:to |a |an |the |it if )|feature request\s*[:—-]|i wish (?:you|we|the|it)|it would be (?:great|helpful|useful) (?:if|to))/i;
 if(!request.test(text))return null;
 const sentence=text.split(/\n|(?<=[.!?])\s/).find(line=>request.test(line))??text;
 const title=sentence.replace(/^feature request\s*[:—-]\s*/i,'').replace(/\s+/g,' ').slice(0,160).trim();
 return title.length>=4?{title,description:text.slice(0,3000)}:null;
}
