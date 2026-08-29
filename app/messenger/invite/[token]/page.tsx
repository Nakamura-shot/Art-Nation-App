import Header from "@/components/Header";
import MessengerParticipantInvite from "@/components/MessengerParticipantInvite";

export default async function ParticipantInvitePage({params}:{params:Promise<{token:string}>}){
 const {token}=await params;
 return <><Header/><main className="container messenger-connect-page"><div className="messenger-connect-shell"><div className="messenger-connect-art">💬</div><MessengerParticipantInvite token={token}/></div></main></>;
}
