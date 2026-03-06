const faq = [
  {
    q: "Jak funguje předplatné?",
    a: "Tvůrci nastaví tiery s měsíční cenou. Odběratelé platí přes Stripe a získají přístup podle úrovně členství.",
  },
  {
    q: "Jaké platby podporujete?",
    a: "Přes Stripe podporujeme karty, Apple Pay i Google Pay. Vše běží automaticky a bezpečně.",
  },
  {
    q: "Můžu nahrávat videa?",
    a: "Ano. Videa se nahrávají přímo přes Bunny Stream a přehrávání je zabezpečené.",
  },
  {
    q: "Jak je chráněn placený obsah?",
    a: "Přístup je vynucený i na databázové vrstvě přes RLS, ne jen skrytý ve frontendu.",
  },
  {
    q: "Jsou tam skryté poplatky?",
    a: "Ne. Máš jasné ceny a kontrolu nad tím, jaké tiery nabízíš.",
  },
];

export function FAQ() {
  return (
    <section className="space-y-8 py-10">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Časté dotazy</h2>
        <p className="mt-3 text-lg text-zinc-600 dark:text-zinc-300">Odpovědi na nejčastější otázky.</p>
      </div>

      <div className="mx-auto w-full max-w-3xl space-y-3">
        {faq.map((item) => (
          <details key={item.q} className="group rounded-2xl glass p-5">
            <summary className="cursor-pointer list-none text-left font-semibold marker:content-none">{item.q}</summary>
            <p className="mt-3 text-sm leading-6 text-zinc-600 dark:text-zinc-300">{item.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
