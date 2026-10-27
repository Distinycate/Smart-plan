import { Fragment, type ReactNode } from 'react';
import { errorThai } from './learning-copy';
export function Bi({ th, en }: { th: string; en: string }) {
  return <span className="emh-bi"><span lang="th">{th}</span>{" "}<span lang="en" className="emh-en">{en}</span></span>;
}
export function Problem({ message }: { message: string }) {
  return <div role="alert" className="emh-error"><p>{errorThai(message)}</p><details><summary>รายละเอียด / Details</summary><p lang="en">{message}</p></details></div>;
}
function inline(text:string):ReactNode {
  return text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((part,i)=>part.startsWith('**')?<strong key={i}>{part.slice(2,-2)}</strong>:part.startsWith('`')?<code key={i}>{part.slice(1,-1)}</code>:<Fragment key={i}>{part}</Fragment>);
}
function block(text:string):ReactNode {
 const lines=text.split('\n'), first=lines[0];
 const language=/[ก-๙]/.test(text)?'th':'en';
 if (/^#{1,6}\s/.test(first)) return <><h5 lang={language}>{inline(first.replace(/^#{1,6}\s+/,''))}</h5>{lines.length>1&&block(lines.slice(1).join('\n'))}</>;
 const tableStart=lines.findIndex((line,i)=>line.trim().startsWith('|') && /^\s*\|?[\s:|-]+\|\s*$/.test(lines[i+1]||''));
 if (tableStart>=0) {
  const cells=(line:string)=>line.trim().replace(/^\||\|$/g,'').split('|').map(c=>c.trim());
  const rows=lines.slice(tableStart+2).filter(l=>l.trim().startsWith('|'));
  const trailing=lines.slice(tableStart+2+rows.length).join('\n');
  return <>{tableStart>0&&block(lines.slice(0,tableStart).join('\n'))}<div className="emh-table-scroll"><table lang={language}><thead><tr>{cells(lines[tableStart]).map((c,i)=><th scope="col" key={i}>{inline(c)}</th>)}</tr></thead><tbody>{rows.map((row,i)=><tr key={i}>{cells(row).map((c,j)=><td key={j}>{inline(c)}</td>)}</tr>)}</tbody></table></div>{trailing&&block(trailing)}</>;
 }
 if(lines.every(l=>/^[-*]\s/.test(l)))return <ul lang={language}>{lines.map((l,i)=><li key={i}>{inline(l.replace(/^[-*]\s+/,''))}</li>)}</ul>;
 if (/^(Reading [AB]|Listening script [AB]|Thai learner guidance|Planning sequence|Quick review|Target vocabulary in context|Pronunciation and prosody)$/.test(first) && lines.length>1)
  return <><h5 lang="en">{first}</h5>{block(lines.slice(1).join('\n'))}</>;
 return <p className="emh-text" lang={language}>{inline(text.replace(/^>\s?/gm,''))}</p>;
}
// A small text-only renderer for authored headings, emphasis and tables; never interprets HTML.
export function StudyText({ text }: { text: string }) {
  return <div className="emh-study-text">{text.split(/\n\s*\n/).map((part,index)=><Fragment key={index}>{block(part)}</Fragment>)}</div>;
}
