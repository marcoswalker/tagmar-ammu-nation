Hooks.on("renderActorSheet", function (sheet, html, character) {
    if (sheet.actor.data.type !== "Personagem") return;
    let teste = html.find('.combate table').first();
    $('<a class="botaoMunicao"><i class="fab fa-pied-piper-hat"></i><span class="mediaeval">Gestão de munições</span></a>').insertBefore($(teste));
    const actor = sheet.actor;
    html.find(".botaoMunicao").click(function () {
        $.get("/modules/tagmar-ammu-nation/templates/dialogAmmo.hbs", function (data) {
            let dialog = new Dialog({
                title: "Gestão de munições",
                content: data,
                buttons: {},
                render: html => {
                    let flag_municoes = actor.getFlag('tagmar-ammu-nation', 'municoes');
                    if (!flag_municoes) flag_municoes = [];
                    atualizaTable();
                    html.find(".add_municao").click(async function () {
                        let name = html.find('.nome_municao').val();
                        let quant = html.find('.quant_municao').val();
                        if (name && quant) {
                            flag_municoes.push({nome: name, quant: quant});
                            await actor.setFlag('tagmar-ammu-nation', 'municoes', flag_municoes);
                            atualizaTable();
                        }
                    });
                    async function atualizaTable (){
                        flag_municoes = await actor.getFlag('tagmar-ammu-nation', 'municoes');
                        if (!flag_municoes) flag_municoes = [];
                        html.find('.nome_municao').val("");
                        html.find('.quant_municao').val("");
                        html.find('.table_municao').html('<tr style="text-align:left;"><th class="mediaeval">Munição</th><th class="mediaeval">Quant</th><th class="mediaeval">Deletar</th></tr>');
                        for (let municao of flag_municoes) {
                            html.find('.table_municao').append("<tr><td class='mediaeval'>"+ municao.nome + "</td><td class='mediaeval'>" + municao.quant + "</td><td><a class='deleteMunicao' data-item-id='"+ municao.nome +"'><i class='fas fa-trash-alt'></i></a></td></tr>");
                        }
                        html.find('.deleteMunicao').click(async function (event) {
                            let new_flag = [];
                            let nome_municao = $(event.currentTarget).data("itemId");
                            for (let mun of flag_municoes) {
                                if (mun.nome != nome_municao) {
                                    new_flag.push(mun);
                                }
                            }
                            await actor.setFlag('tagmar-ammu-nation', 'municoes', new_flag);
                            atualizaTable();
                        });
                    }
                }
            });
            dialog.render(true);
        });
    });
});

Hooks.on("renderItemSheet", async function (sheet, html, item) {
    const item_sheet = sheet.item;
    if (item_sheet.data.type === "Combate" && sheet.actor !== null) {
        html.find('[name="data.municao"]').prop("readonly",true);
        //let bonus_dano = html.find('[name="data.bonus_dano"]');
        let bonus_dano = html.find('.row .dados').first();
        $('<div class="row dados"><div class="col-md-12"><label class="mediaeval" for="municoes_mod">Escolha a Munição: </label><select name="municoes_mod" class="municoes_mod"><option value=""></option></select></div></div>').insertBefore($(bonus_dano));
        let municoes_tag = sheet.actor.getFlag('tagmar-ammu-nation', 'municoes');
        for (let mun of municoes_tag) {
            html.find('.municoes_mod').append("<option class='mediaeval' value='"+mun.nome+"'>"+mun.nome+"</option>");
        }
        let ammu_item = await sheet.actor.getFlag('tagmar-ammu-nation', item_sheet.data.name);
        if (ammu_item) html.find('.municoes_mod').val(ammu_item).change();
        else html.find('.municoes_mod').val("").change();
        html.find(".municoes_mod").change(async function () {
            let municao = html.find(".municoes_mod").val();
            if (municao !== "") {
                await sheet.actor.setFlag('tagmar-ammu-nation', item_sheet.data.name, municao);
                let ammu = {};
                for (let mun of municoes_tag) {
                    if (mun.nome === municao) ammu = mun;
                }
                item_sheet.update({
                    'data.municao': ammu.quant
                });
            } else {
                await sheet.actor.unsetFlag('tagmar-ammu-nation', item_sheet.data.name);
                item_sheet.update({
                    'data.municao': 0
                });
            }
        });
    }
});

Hooks.on('tagmar_itemRoll', async function (roolItem, user) {
    if (user !== game.user) return;
    if (roolItem.data.type !== "Combate") return;
    const actor = roolItem.actor;
    let municao_flags = await actor.getFlag('tagmar-ammu-nation', 'municoes');
    if (typeof municao_flags === 'undefined') return;
    let item_flag = await actor.getFlag('tagmar-ammu-nation', roolItem.data.name);
    if (typeof item_flag === 'undefined') return;
    let new_flag = [];
    for (let mun of municao_flags) {
        if (mun.nome === item_flag) {
            new_flag.push({nome: mun.nome, quant: mun.quant-1});
        } else new_flag.push(mun);
    }
    if (new_flag.length > 0) await actor.setFlag('tagmar-ammu-nation', 'municoes', new_flag);
    for (let item of actor.items) {
        if (item.type === "Combate" && actor.getFlag('tagmar-ammu-nation', item.name) === item_flag && typeof actor.getFlag('tagmar-ammu-nation', item.name) !== 'undefined' && item.name !== roolItem.data.name) {
            await item.update({
                'data.municao': item.data.data.municao-1
            });
        }
    }
});

Hooks.on('ready', function () {
    if (!(game.system.id === "tagmar_rpg" || game.system.id === "tagmar")) return ui.notifications.error("Esse módulo só funciona com o sistema Tagmar, não insista.");
});