// ═══════════════════════════ O Deserto das Vozes ═══════════════════════════

=== deserto_chegada ===
espirito: Este é o Deserto das Vozes. Aqui o silêncio é grande, e por isso as vozes falsas parecem altas.
espirito: Siga os marcos de pedra até a caverna de Santo Antão. Ele já venceu este deserto antes de você.
-> END

=== deserto_dica_vozes ===
espirito: Ouviu? São as vozes do deserto. Elas falam bonito, mas não falam a verdade.
espirito: Quando alguma coisa parecer boa demais, desconfie. Não saia do rastro dos marcos.
-> END

=== deserto_dica_miragem ===
espirito: A tentação se veste de coisa boa. Por trás da miragem havia uma sombra.
espirito: Vença-a, e o deserto vai recuperando a cor.
-> END

=== deserto_poco ===
espirito: Água de verdade, não de miragem. "Quem beber da água que eu lhe der nunca mais terá sede." (Jo 4,14)
-> END

=== deserto_cruz ===
{ primeira("deserto_cruz"):
    espirito: Também aqui, junto à cruz, a oração tem o dobro de força.
- else:
    inscricao: "Não só de pão vive o homem, mas de toda palavra que sai da boca de Deus." (Mt 4,4)
}
-> END

=== deserto_parede_revelada ===
espirito: A rocha era falsa! O penhasco não estava fechado: o medo é que fazia parecer.
espirito: A fenda segue para oeste.
-> END

=== deserto_restaurado ===
espirito: O deserto também tem cor! Nenhuma voz falsa sobrou entre as dunas.
espirito: Agora só resta o que mora depois da fenda.
-> END

// ─────────────────────────────── Santo Antão ───────────────────────────────

=== antao ===
{
- not tem("dom_ciencia"): -> encontro
- not tem("deserto_parede"): -> fenda
- tem("meiodia_vencido"): -> vitoria
- else: -> meiodia
}

= encontro
antao: Paz a você, {nome()}. Eu sou Antão. Você atravessou as vozes e chegou até aqui.
antao: Quando eu era jovem, ouvi na igreja: "Se queres ser perfeito, vai, vende o que tens, dá aos pobres, e depois vem e segue-me." Vendi tudo e vim para o deserto.
antao: Aqui as vozes me mostraram ouro no caminho, banquetes, a saudade de casa. Tudo parecia bom. Tudo era armadilha.
antao: Um dia vi as armadilhas do inimigo espalhadas pela terra inteira e perguntei: "Quem pode escapar delas?" E ouvi uma voz: "A humildade."
espirito: Antão aprendeu a distinguir o verdadeiro do falso. Isso é o dom da Ciência.
antao: Receba-o. Quando alguma coisa parecer bonita demais, olhe de novo, com os olhos de Deus.
~ evento("dom_ciencia")
espirito: Aperte E para usar a Ciência. Ela gasta 15 de energia e, por alguns segundos, mostra o que as coisas são de verdade. #pausa:1.4
antao: A oeste, onde o penhasco parece fechado, há uma fenda. Olhe para ela com a Ciência.
-> END

= fenda
antao: O penhasco a oeste esconde uma fenda. Chegue perto dele e use a Ciência (E).
~ temp n = valor("miragens")
{ n > 0:
    antao: Ainda {n == 1: resta uma miragem|restam {n} miragens} no deserto. Cada uma esconde uma sombra.
}
-> END

= vitoria
antao: Você voltou, {nome()}. Eu vi a água subir no poço: o demônio do meio-dia foi vencido.
antao: Ele vai voltar outras vezes, em outros dias quentes. Quando voltar, faça o que fez hoje: reze, e continue a caminhar.
-> END

= meiodia
antao: Depois da fenda mora o demônio do meio-dia. Ele não grita: ele cansa. Faz a alma achar que nada vale a pena.
antao: Quando o cansaço chegar, não pare de rezar. Vá com Deus.
-> END
