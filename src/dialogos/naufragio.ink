// ═══════════════════════════ O Mar da Tempestade: o naufrágio ═══════════════════════════
// Terceira parte da região de São Paulo: o encalhe na enseada de Malta, os presos, a Ira e a praia (At 27,39-44).
// O chefão é a Ira: a raiva que responde no mesmo tom. Vence-se pela mansidão (Pr 15,1).
// As falas de Atos e dos Provérbios vêm com a referência; o resto é fala de personagem.

=== naufragio_encalhe ===
espirito: Cortaram as âncoras e as deixaram no mar; soltaram as amarras dos lemes, içaram ao vento a vela da proa e rumaram para a praia (At 27,40). #plano:geral
espirito: Mas deram num lugar entre dois mares e encalharam o navio. A proa, encravada, ficou imóvel; a popa se desfazia com a violência das ondas (At 27,41). #pausa:0.8
soldado: Os presos! Se chegarem a terra, fogem! #gesto:nao
soldado: Melhor acabar com eles aqui. Nenhum foge a nado. #gesto:explicar
espirito: Os soldados resolveram matar os presos, para que nenhum escapasse a nado (At 27,42).
{ tem("navio_gritou") or tem("creta_conselho_ira"):
    espirito: Você conhece essa raiva. Ela já passou pelo seu peito, neste mesmo navio.
}
espirito: Na proa, os soldados já têm a espada na mão. Paulo está entre os presos. Vá até lá.
-> END

=== naufragio_presos ===
soldado: Afaste-se, peregrino. Preso que foge, a cabeça é nossa. #gesto:nao #plano:geral
preso: Por favor... A gente remou com vocês. Partimos o pão juntos. #gesto:triste
* [Chamar o centurião, sem levantar a voz: "Júlio, Paulo está entre eles."]
    ~ marcar("naufragio_presos_manso")
    julio: ... Paulo. #gesto:pensar #plano:perto
    -> salvos
* [Segurar o braço do soldado e gritar com ele.]
    ~ marcar("naufragio_presos_ira")
    soldado: Tire a mão de mim! #gesto:nao
    espirito: A raiva responde à raiva, e a espada sobe mais um pouco. Mas alguém já estava olhando para Paulo.
    -> salvos
* [Pôr-se calado entre a espada e os presos.]
    ~ marcar("naufragio_presos_calado")
    soldado: Saia da frente! #gesto:nao
    espirito: Você não diz nada. Fica ali. E o soldado hesita.
    -> salvos

= salvos
julio: Soldados! Guardem as espadas. Ninguém toca nos presos. #gesto:explicar #plano:geral
espirito: Mas o centurião, querendo salvar Paulo, impediu que fizessem isso (At 27,43).
julio: Quem sabe nadar, salte primeiro e vá para a terra! #gesto:explicar
julio: Os outros, nas tábuas e nos pedaços do navio! Todos! #gesto:explicar
espirito: Mandou que os que sabiam nadar se lançassem primeiro ao mar e chegassem a terra; e os outros, uns em tábuas, outros em pedaços do navio (At 27,43-44).
paulo: Coragem. Nenhum se perderá. Ele prometeu. #gesto:acolher #plano:perto
~ evento("presos")
-> END

// ─── A Ira ───

=== naufragio_ira ===
espirito: Entre o navio e a praia, o mar ferve. Alguma coisa sobe da água. #plano:geral
ira: Isso. Olhe para eles. Os soldados quase mataram os presos. O dono do navio não quis ouvir. O piloto riu do aviso.
ira: E você aí, manso. Não tem sangue?
{ tem("navio_gritou") or tem("creta_conselho_ira") or tem("naufragio_presos_ira"):
    ira: Eu te conheço. Você gritou com eles. Foi bom, não foi? Grite de novo.
    espirito: A brasa já começa acesa em você. Reze antes de tudo.
}
espirito: É a Ira. A água que ela é não se fere: cada golpe que você der acende a brasa do seu próprio peito.
espirito: "A resposta branda aplaca o furor; a palavra dura excita a ira" (Pr 15,1).
espirito: Quando ela vier com a fúria, não revide: esquive e deixe passar. Quando ela provocar, reze. Cansada, ela mostra a brasa do peito. Só então golpeie.
-> END

=== naufragio_ira_vencida ===
espirito: A água cai de volta no mar, mansa. O vento esmorece, e a chuva vira garoa. #plano:geral
espirito: "Todo homem seja pronto para ouvir, lento para falar e lento para se irar, porque a ira do homem não realiza a justiça de Deus" (Tg 1,19-20).
espirito: E assim aconteceu que todos chegaram salvos a terra (At 27,44). #pausa:0.6
-> END

=== naufragio_praia ===
paulo: Duzentas e setenta e seis almas. Nenhuma se perdeu. #gesto:ceu #plano:geral
lucas: Contei de novo. Estão todos aqui. #gesto:sim
julio: Paulo... Eu ia deixar que matassem os presos. E você estava entre eles. #gesto:triste
paulo: Mas você não deixou. Deus viu isso também. #gesto:acolher #plano:perto
espirito: Depois de salvos, souberam que a ilha se chamava Malta (At 28,1). #plano:geral
espirito: Está frio, e a garoa não para. Lá do alto, os moradores da ilha descem para ver o que o mar trouxe.
espirito: (Malta, o fogo, a víbora e a cor que volta são a próxima parte do caminho, ainda em construção.)
-> END

// ─── A gente do naufrágio ───

=== naufragio_paulo ===
{ tem("naufragio_ira_vencida"):
    { shuffle:
    - paulo: Ele cumpre o que promete. Sempre. #gesto:ceu
    - paulo: Agora, um fogo. Esta gente está gelada. #gesto:explicar
    }
- else:
    { tem("naufragio_presos"):
        paulo: Eu rezo por você. Vá, e não responda à fúria com fúria. #gesto:rezar
    - else:
        paulo: Não tenha medo por mim. Fale com Júlio. Ele ouve, quando a gente fala com calma. #gesto:acolher
    }
}
-> END

=== naufragio_lucas ===
{ tem("naufragio_ira_vencida"):
    lucas: Vou escrever isto também. Cada tábua. #gesto:explicar
- else:
    lucas: Segure firme. Eu cuido de quem chegar machucado. #gesto:explicar
}
-> END

=== naufragio_aristarco ===
{ tem("naufragio_ira_vencida"):
    aristarco: Malta. Nunca pensei que fosse ficar tão feliz de ver areia. #gesto:sim
- else:
    aristarco: Fique perto de Paulo. Onde ele está, a gente reza. #gesto:rezar
}
-> END

=== naufragio_julio ===
{ tem("naufragio_presos"):
    { tem("naufragio_ira_vencida"):
        julio: Nenhum fugiu. Nenhum morreu. Nunca vi isso num naufrágio. #gesto:pensar
    - else:
        julio: Para a praia! Não pare na água! #gesto:explicar
    }
- else:
    -> naufragio_presos
}
-> END

=== naufragio_soldado ===
{ tem("naufragio_presos"):
    { tem("naufragio_ira_vencida"):
        soldado: Guardei a espada. Melhor assim. #gesto:triste
    - else:
        soldado: Os presos estão aqui. Todos. Pode contar. #gesto:sim
    }
- else:
    -> naufragio_presos
}
-> END

=== naufragio_preso ===
{ tem("naufragio_presos"):
    { tem("naufragio_ira_vencida"):
        preso: Estou vivo. Ainda não acredito. #gesto:triste
    - else:
        preso: Obrigado. Você ficou do nosso lado. #gesto:sim
    }
- else:
    -> naufragio_presos
}
-> END

=== naufragio_marinheiro ===
{ tem("naufragio_ira_vencida"):
    marinheiro: Quatorze dias brigando com o mar. E foi a mansidão que nos trouxe à praia. #gesto:pensar
- else:
    { tem("naufragio_presos"):
        marinheiro: Eu sei nadar! Já estou na praia! Venha! #gesto:explicar
    - else:
        marinheiro: Vamos ter que nadar. A popa não aguenta mais. #gesto:nao
    }
}
-> END

=== naufragio_piloto ===
{ tem("naufragio_ira_vencida"):
    piloto: Eu disse que era seguro partir de Creta. Eu estava errado. #gesto:triste
- else:
    piloto: Nunca vi um mar assim. Nem em Alexandria. #gesto:nao
}
-> END

=== naufragio_nauclero ===
{ tem("naufragio_ira_vencida"):
    nauclero: Perdi o navio. O trigo. Tudo. ... E estou vivo. Engraçado o que a gente descobre que vale. #gesto:pensar
- else:
    nauclero: O meu navio... #gesto:triste
}
-> END
