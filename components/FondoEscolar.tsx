import React from "react";

const FondoEscolar = () => {
  return (
    <div
      className="fixed inset-0 z-0 pointer-events-none opacity-[0.15]"
      style={{
        backgroundImage: `
          radial-gradient(circle at 15% 15%, var(--azul) 5px, transparent 5px),
          radial-gradient(circle at 85% 20%, var(--azul) 6px, transparent 6px),
          radial-gradient(circle at 20% 80%, var(--azul) 5px, transparent 5px),
          radial-gradient(circle at 80% 85%, var(--azul) 6px, transparent 6px),
          radial-gradient(circle at 50% 50%, var(--azul) 4px, transparent 4px)
        `,
        backgroundSize: "300px 300px, 400px 400px, 350px 350px, 450px 450px, 200px 200px",
      }}
    />
  );
};

export default FondoEscolar;
