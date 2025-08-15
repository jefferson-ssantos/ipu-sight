import orysLogo from "@/assets/orys-logo.png";

const Index = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <div className="flex justify-center mb-8">
          <img src={orysLogo} alt="Orys Logo" className="h-16" />
        </div>
        <h1 className="text-4xl font-bold mb-4 text-foreground">Bem-vindo ao IPU-Sight</h1>
        <p className="text-xl text-muted-foreground">Plataforma FinOps para IDMC</p>
      </div>
    </div>
  );
};

export default Index;
