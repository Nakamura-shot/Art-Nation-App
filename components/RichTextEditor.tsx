"use client";
import {useEffect,useRef} from "react";

export default function RichTextEditor({value,onChange}:{value:string;onChange:(html:string)=>void}){
 const ref=useRef<HTMLDivElement>(null);
 useEffect(()=>{if(ref.current && ref.current.innerHTML!==value) ref.current.innerHTML=value||""},[value]);
 function cmd(command:string,arg?:string){
   ref.current?.focus();
   document.execCommand(command,false,arg);
   onChange(ref.current?.innerHTML||"");
 }
 return <div className="rich-editor">
  <div className="rich-toolbar">
   <select aria-label="Text style" defaultValue="p" onChange={e=>cmd("formatBlock",e.target.value)}>
    <option value="p">Paragraph</option><option value="h2">Heading 2</option><option value="h3">Heading 3</option><option value="blockquote">Quote</option>
   </select>
   <select aria-label="Font" defaultValue="Arial" onChange={e=>cmd("fontName",e.target.value)}>
    <option>Arial</option><option>Georgia</option><option>Verdana</option><option>Trebuchet MS</option><option>Courier New</option><option>Times New Roman</option>
   </select>
   <select aria-label="Font size" defaultValue="3" onChange={e=>cmd("fontSize",e.target.value)}>
    <option value="2">12px</option><option value="3">16px</option><option value="4">18px</option><option value="5">24px</option><option value="6">32px</option>
   </select>
   <span className="toolbar-divider"/>
   <button type="button" title="Bold" onMouseDown={e=>{e.preventDefault();cmd("bold")}}><b>B</b></button>
   <button type="button" title="Italic" onMouseDown={e=>{e.preventDefault();cmd("italic")}}><i>I</i></button>
   <button type="button" title="Underline" onMouseDown={e=>{e.preventDefault();cmd("underline")}}><u>U</u></button>
   <button type="button" title="Strikethrough" onMouseDown={e=>{e.preventDefault();cmd("strikeThrough")}}>S̶</button>
   <label className="color-tool" title="Font color">A<input type="color" defaultValue="#172033" onChange={e=>cmd("foreColor",e.target.value)}/></label>
   <span className="toolbar-divider"/>
   <button type="button" title="Align left" onMouseDown={e=>{e.preventDefault();cmd("justifyLeft")}}>☰</button>
   <button type="button" title="Center" onMouseDown={e=>{e.preventDefault();cmd("justifyCenter")}}>≡</button>
   <button type="button" title="Bulleted list" onMouseDown={e=>{e.preventDefault();cmd("insertUnorderedList")}}>•≡</button>
   <button type="button" title="Numbered list" onMouseDown={e=>{e.preventDefault();cmd("insertOrderedList")}}>1≡</button>
   <button type="button" title="Undo" onMouseDown={e=>{e.preventDefault();cmd("undo")}}>↶</button>
   <button type="button" title="Redo" onMouseDown={e=>{e.preventDefault();cmd("redo")}}>↷</button>
   <button type="button" title="Clear formatting" onMouseDown={e=>{e.preventDefault();cmd("removeFormat")}}>Tx</button>
  </div>
  <div ref={ref} className="rich-editor-body" contentEditable suppressContentEditableWarning
       data-placeholder="Describe the workshop, what is included, and who it is for."
       onInput={e=>onChange((e.currentTarget as HTMLDivElement).innerHTML)} />
 </div>
}