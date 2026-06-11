import ChatWall from "../components/ChatWall";

export default function Chat() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <div className="mb-6 animate-fade-up">
        <span className="label-eyebrow">Comunidad</span>
        <h1 className="font-display font-black text-3xl sm:text-4xl mt-1 tracking-tight">
          Chat del torneo
        </h1>
        <p className="text-zinc-400 mt-2 text-sm sm:text-base max-w-2xl">
          Conversa en vivo, comparte stickers y mantente al tanto de la polla.
        </p>
      </div>
      <ChatWall />
    </div>
  );
}
