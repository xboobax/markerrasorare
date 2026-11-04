export default function DreamTitle({eyebrow,title,description,children}:{eyebrow:string;title:string;description:string;children?:React.ReactNode}){
  return <header className="dream-page-heading"><div><span className="dream-eyebrow">{eyebrow}</span><h1>{title}</h1><p>{description}</p></div>{children&&<div className="dream-page-actions">{children}</div>}</header>;
}
