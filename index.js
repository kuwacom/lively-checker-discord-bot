const botSeting = require("./setting.json")
const dataSetPath = "./data_set.json"
let dataSet = require(dataSetPath)
const log4js = require('log4js')
const logger = log4js.getLogger("<LOG>")
const loggerBOT = log4js.getLogger("<BOT>")
const loggerTASK = log4js.getLogger("<TASK>")
const loggerCMD = log4js.getLogger("<CMD>")
const loggerCHAT = log4js.getLogger("<CHAT>")
logger.level = 'all'
loggerBOT.level = 'all'
loggerTASK.level = 'all'
loggerCMD.level = 'all'
loggerCHAT.level = 'all'
const fs = require("fs")

/**
 * 使用モジュール
 * npm i discord.js , @discordjs/builders
 */
const { Client, Intents, MessageEmbed, MessageActionRow, MessageSelectMenu, MessageButton, Constants } = require('discord.js');
const client = new Client({
    intents:["GUILDS", "GUILD_MESSAGES", ""],
    ws:{properties:{$browser:"Discord iOS"}}
});
const sleep = msec => new Promise(resolve => setTimeout(resolve, msec));

let num = 0
dataSet.forEach(d=>num++)//データセット内のサーバー数
loggerBOT.info('BOT Starting...')
loggerBOT.info(`read setting
data cash save timing: ${botSeting.dataCash}s
read ${num} channels`)

async function task (){
    let timeNum = 0
    let guildNumBack = 0
    while(1){
        await sleep(1000)
        {//サーバーに参加したかチェック
            let guildNum = 0
            client.guilds.cache.forEach(()=> guildNum++)
            if(guildNum > guildNumBack){//実行前の合計接続参加サーバー数と比較してもし多かったら実行
                client.guilds.cache.forEach(async guild => {
                    try{//すべてのサーバーのスラコマ設定 グローバルコマンドと違ってすぐに反映可能だが推奨ではない
                        // await guild.commands.set([]);
                        // loggerTASK.info(guild.name+" has been RESET")
                        await guild.commands.set(botSeting.commands);
                        loggerTASK.info(guild.name+" has been set application command")
                    }catch(e){
                        loggerTASK.error(e)//アプリケーションコマンド使えない招待や一日のクオーター制限等でコマンドが設定できない場合
                    }
                })
                loggerTASK.info("ALL Guild set application");
            }
            guildNumBack = guildNum

        }
        {//キャッシュ定期保存
            if(botSeting.dataCash*60 < timeNum){//設定のキャッシュタイムを分単位に直して比較
                loggerTASK.info("Saving memory cash...")
                fs.writeFileSync(dataSetPath, JSON.stringify(dataSet));
                timeNum = 0
                loggerTASK.info("DONE")
            }
            timeNum++
        }
        {//定期結果表示
            const now = new Date()
            dataSet.forEach(data => {
                if(data.showChannelId == null) return;//表示チャンネルのidがnullの時はoff
                if(data.showTimeH == now.getHours() && data.showTimeM == now.getMinutes() && data.showTimeM == now.getSeconds()){//現在の時刻と設定されている時刻が同じになったら
                    const channel = client.channels.cache.find(channel => channel.id == data.showChannelId)
                    const sCChannel = client.channels.cache.find(channel => channel.id == data.channelId)
                    let messageCumulativeNum = 0;
                    let messageNum = 0;
                    //すべての時間を forEach で確認している
                    Object.keys(data.data.messageCumulative[now.getFullYear()][now.getMonth()+1][now.getDate()]).forEach(key => {
                        Object.keys(data.data.messageCumulative[now.getFullYear()][now.getMonth()+1][now.getDate()][key]).forEach(_key => {
                            Object.keys(data.data.messageCumulative[now.getFullYear()][now.getMonth()+1][now.getDate()][key][_key]).forEach(__key => {
                                messageCumulativeNum = messageCumulativeNum + data.data.messageCumulative[now.getFullYear()][now.getMonth()+1][now.getDate()][key][_key][__key].length
                                data.data.messageCumulative[now.getFullYear()][now.getMonth()+1][now.getDate()][key][_key][__key].forEach(msg => {
                                    messageNum = messageNum + msg
                                })
                            });
                        });
                    });

                    const dateT = new Date(data.addTime)
                    let formattedDate = dateT.getFullYear() + "/" + (dateT.getMonth() + 1) + "/" + dateT.getDate() + " " + dateT.getHours() + ":" + dateT.getMinutes() + ":" + dateT.getSeconds();        
                    const messageNumAverage = messageNum / messageCumulativeNum
                    const embed = new MessageEmbed()
                    .setTitle("本日の活気度")
                    .setDescription(`<#${sCChannel.id}>・${formattedDate}`)
                    .setColor('RANDOM')
                    embed.addFields([
                        {
                            name: "メッセージ数",
                            value: String(messageCumulativeNum)
                        },
                        {
                            name: "メッセージ文字数",
                            value: String(messageNum)
                        },
                        {
                            name: "発言平均文字数",
                            value: String(messageNumAverage)
                        }
                    ])
                    channel.send({embeds : [embed]})
                    loggerTASK.info(`Send show to channel ${channel.guild.name} | ${channel.name}`)
                }
            })
        }
    }
}

client.once("ready", async () => {
    task()
    let data = botSeting.commands
    /** command TYPE is
     *  BOOLEAN
     *  CHANNEL
     *  INTEGER
     *  MENTIONBLE
     *  NUMBER
     *  ROLE
     *  STRING
     *  SUB_COMMAND
     *  SUB_COMMAND_GROUP
     *  USER
     *   Constants.ApplicationCommandOptionTypes.CHANNEL
     */ 

    if(botSeting.debug){data.forEach(d => {logger.debug(d)})}
    //グローバルコマンド設定 コマンドを頻繁に変更しない場合はこっちを使うことを推奨
    // client.guilds.cache.forEach(async guild => {
    //     await guild.commands.set([]);
    //     loggerTASK.info(guild.name+" has been RESET")
    //     await guild.commands.set(data);
    //     loggerTASK.info(guild.name+" has been set application command")
    // })
    // loggerTASK.info("ALL Guild set application");

    // await client.application.commands.set(data);
    // loggerTASK.info("Global set application Ready!");
});

client.on('ready',async () => {
    loggerTASK.info("BOT logined to discord")
    let guildNum = 0
    let channelNum = 0
    client.guilds.cache.forEach(()=> guildNum++)//bot参加サーバー数
    client.channels.cache.forEach(()=> channelNum++)//参加しているサーバーにあるすべてのチャンネル数
    loggerBOT.info(`GUILDnum: ${guildNum} CHANNELnum: ${channelNum}`)
});

client.on('messageCreate', message => {
    if(message.author.bot){return}
    if(botSeting.debug && !(message.content == "")){loggerCHAT.debug(`[${message.guild.name}][${message.channel.name}]<${message.author.username}#${message.author.discriminator}> ${message.content}`)} 

    const mesChannel = message.channel
    const now = new Date()
    
    let num = 0;
    let flag = 0;
    for(data of dataSet){//メッセージの入力されたチャンネルがデータセット内にあるかどうか
        if(data.channelId == mesChannel.id){
            flag = 1
            break
        }
        num++
    }

    if(flag){
        //もし追加したばかりでオブジェクト自体が存在しない場合は新たに定義するようにしている
        if(!(typeof dataSet[num].data.messageCumulative[now.getFullYear()] === 'object')){
            dataSet[num].data.messageCumulative[now.getFullYear()] = {}
        }
        if(!(typeof dataSet[num].data.messageCumulative[now.getFullYear()][now.getMonth()+1] === 'object')){
            dataSet[num].data.messageCumulative[now.getFullYear()][now.getMonth()+1] = {}
        }
        if(!(typeof dataSet[num].data.messageCumulative[now.getFullYear()][now.getMonth()+1][now.getDate()] === 'object')){
            dataSet[num].data.messageCumulative[now.getFullYear()][now.getMonth()+1][now.getDate()] = {}
        }
        if(!(typeof dataSet[num].data.messageCumulative[now.getFullYear()][now.getMonth()+1][now.getDate()][now.getHours()] === 'object')){
            dataSet[num].data.messageCumulative[now.getFullYear()][now.getMonth()+1][now.getDate()][now.getHours()] = {}
        }
        if(!(typeof dataSet[num].data.messageCumulative[now.getFullYear()][now.getMonth()+1][now.getDate()][now.getHours()][now.getMinutes()] === 'object')){
            dataSet[num].data.messageCumulative[now.getFullYear()][now.getMonth()+1][now.getDate()][now.getHours()][now.getMinutes()] = {}
        }
        if(dataSet[num].data.messageCumulative[now.getFullYear()][now.getMonth()+1][now.getDate()][now.getHours()][now.getMinutes()][message.author.id] == null){
            dataSet[num].data.messageCumulative[now.getFullYear()][now.getMonth()+1][now.getDate()][now.getHours()][now.getMinutes()][message.author.id] = []
        }
        dataSet[num].data.messageCumulative[now.getFullYear()][now.getMonth()+1][now.getDate()][now.getHours()][now.getMinutes()][message.author.id].push(message.content.length)
        if(botSeting.debug){logger.debug(dataSet[num])}
    }
    
})


client.on("interactionCreate", async (interaction) => {
    if (!interaction.isCommand()) return;
    if (interaction.commandName === 'add') {
        if(botSeting.debug){loggerCMD.debug(`[add] in ${interaction.guild.name} by ${interaction.user.username}#${interaction.user.discriminator}`)}

        const sC = interaction.options._hoistedOptions.find(data => data.name == "scan-channel")//インタラクションコマンドのサブコマンドの引数を検索
        if (sC == undefined){
            const embed = new MessageEmbed()
            .setTitle('⚠ エラー')
            .setColor(0xff0000)
            .setDescription('**テキストチャンネルをロードできませんでした**\n')
            interaction.reply({
                embeds : [embed],
                ephemeral: true
            })
            return
        }
        const scanChannel = sC.channel

        //結果チャンネルがあるかどうか
        const shC = interaction.options._hoistedOptions.find(data => data.name == "show-channel")
        let showChannel
        if(shC == undefined){ showChannel = null }else{ showChannel = shC.channel }//表示チャンネルが設定されていない場合は null (offモード)へ
    
        let sh = interaction.options._hoistedOptions.find(data => data.name == "show-hour")
        let sm = interaction.options._hoistedOptions.find(data => data.name == "show-minute")
        let ss = interaction.options._hoistedOptions.find(data => data.name == "show-second")
        if(sh == undefined){ sh = 0 }else{sh = sh.value}//時刻が設定されていない場合はデフォルトの 0 を割り当て
        if(sm == undefined){ sm = 0 }else{sm = sm.value}
        if(ss == undefined){ ss = 0 }else{ss = ss.value}


        if (!(scanChannel.type === "GUILD_TEXT")){//選択されたチャンネルがテキストチャンネル以外だったら(スラッシュコマンドでテキストチャンネルのみの選択にできるがなぜかバグるのでここで判別)
            const embed = new MessageEmbed()
            .setTitle('⚠ エラー')
            .setColor(0xff0000)
            .setDescription('**テキストチャンネルを選択してください**\n')
            interaction.reply({
                embeds : [embed],
                ephemeral: true
            })
            return
        }
        let flag = 0;
        dataSet.forEach(data => {//すでにデータセット内に追加したいチャンネルが存在しているのか検索
            if(data.channelId == scanChannel.id){
                return flag = 1
            }
        })
        if(flag){//すでに追加されている場合
            const embed = new MessageEmbed()
            .setTitle('⚠ エラー')
            .setColor(0xffd700)
            .setDescription('**そのチャンネルはすでに追加されています**\n')
            interaction.reply({
                embeds : [embed],
                ephemeral: true
            })
        }
        const embed = new MessageEmbed()
        .setTitle('測定するチャンネルを追加しました')
        .setDescription(`**測定するチャンネル**: <#${scanChannel.id}>
        ${showChannel == null ? "" : `**定期表示するチャンネル**: <#${interaction.guild.id}/${showChannel.id}>`}`)
        .setColor(0x00ff7f)
        dataSet.push(
            {
                channelId: scanChannel.id,
                addTime: Date.now(),
                showTimeH: sh,
                showTimeM: sm,
                showTimeS: ss,
                showChannelId: showChannel == null ? null : showChannel.id,
                data:{
                    messageCumulative: {}
                },
            }
        )
        fs.writeFileSync(dataSetPath, JSON.stringify(dataSet));
        interaction.reply({
            embeds : [embed],
            ephemeral: false
        })
    }
    if (interaction.commandName === 'remove'){
        if(botSeting.debug){loggerCMD.debug(`[remove] in ${interaction.guild.name} by ${interaction.user.username}#${interaction.user.discriminator}`)}
        const sC = interaction.options._hoistedOptions.find(data => data.name == "scan-channel")
        if (sC == undefined){
            const embed = new MessageEmbed()
            .setTitle('⚠ エラー')
            .setColor(0xff0000)
            .setDescription('**テキストチャンネルをロードできませんでした**\n')
            interaction.reply({
                embeds : [embed],
                ephemeral: true
            })
            return
        }
        const scanChannel = sC.channel
        let num = 0;
        let flag = 0;
        
        for(data of dataSet){
            console.log(data.channelId)
            console.log(scanChannel.id)
            console.log("\n")
            if(data.channelId == scanChannel.id){
                flag = 1
                break
            }
            num++
        }
        if(!flag){
            const embed = new MessageEmbed()
            .setTitle('⚠ エラー')
            .setColor(0xffd700)
            .setDescription('**そのチャンネルは測定していません**\n')
            interaction.reply({
                embeds : [embed],
                ephemeral: true
            })
            return
        }
        loggerBOT.debug(dataSet[num])
        dataSet.splice(num,1)
        loggerBOT.info(`remove scan-channel ${scanChannel.name}`)
        const embed = new MessageEmbed()
        .setTitle(`測定チャンネルを削除しました`)
        .setDescription(`削除したチャンネル: <#${scanChannel.id}>`)
        .setColor(0xffd700)
        interaction.reply({embeds : [embed]})
    }
    if (interaction.commandName === 'show'){
        if(botSeting.debug){loggerCMD.debug(`[show] in ${interaction.guild.name} by ${interaction.user.username}#${interaction.user.discriminator}`)}
        const sC = interaction.options._hoistedOptions.find(data => data.name == "scan-channel")
        if (sC == undefined){
            const embed = new MessageEmbed()
            .setTitle('⚠ エラー')
            .setColor(0xff0000)
            .setDescription('**テキストチャンネルをロードできませんでした**\n')
            interaction.reply({
                embeds : [embed],
                ephemeral: true
            })
            return
        }
        const scanChannel = sC.channel

        let num = 0;
        let flag = 0;
        for(data of dataSet){
            if(data.channelId == scanChannel.id){
                flag = 1
                break
            }
            num++
        }
        if(!flag){
            const embed = new MessageEmbed()
            .setTitle('⚠ エラー')
            .setColor(0xffd700)
            .setDescription('**そのチャンネルは測定していません**\n')
            interaction.reply({
                embeds : [embed],
                ephemeral: true
            })
            return
        }

        {
            const now = new Date()
            let messageCumulativeNum = 0;
            let messageNum = 0;

            console.log(typeof dataSet[num].data.messageCumulative[now.getFullYear()])
            if(!(typeof dataSet[num].data.messageCumulative[now.getFullYear()] === 'object')){
                dataSet[num].data.messageCumulative[now.getFullYear()] = {}
            }
            console.log(typeof dataSet[num].data.messageCumulative[now.getFullYear()][now.getMonth()+1])
            if(!(typeof dataSet[num].data.messageCumulative[now.getFullYear()][now.getMonth()+1] === 'object')){
                dataSet[num].data.messageCumulative[now.getFullYear()][now.getMonth()+1] = {}
            }
            console.log(typeof dataSet[num].data.messageCumulative[now.getFullYear()][now.getMonth()+1][now.getDate()])
            if(!(typeof dataSet[num].data.messageCumulative[now.getFullYear()][now.getMonth()+1][now.getDate()] === 'object')){
                dataSet[num].data.messageCumulative[now.getFullYear()][now.getMonth()+1][now.getDate()] = {}
            }
            if(!(typeof dataSet[num].data.messageCumulative[now.getFullYear()][now.getMonth()+1][now.getDate()][now.getHours()] === 'object')){
                dataSet[num].data.messageCumulative[now.getFullYear()][now.getMonth()+1][now.getDate()][now.getHours()] = {}
            }
            if(!(typeof dataSet[num].data.messageCumulative[now.getFullYear()][now.getMonth()+1][now.getDate()][now.getHours()][now.getMinutes()] === 'object')){
                dataSet[num].data.messageCumulative[now.getFullYear()][now.getMonth()+1][now.getDate()][now.getHours()][now.getMinutes()] = {}
            }

            Object.keys(dataSet[num].data.messageCumulative[now.getFullYear()][now.getMonth()+1][now.getDate()]).forEach(key => {
                Object.keys(dataSet[num].data.messageCumulative[now.getFullYear()][now.getMonth()+1][now.getDate()][key]).forEach(_key => {
                    Object.keys(dataSet[num].data.messageCumulative[now.getFullYear()][now.getMonth()+1][now.getDate()][key][_key]).forEach(__key => {
                        messageCumulativeNum = messageCumulativeNum + dataSet[num].data.messageCumulative[now.getFullYear()][now.getMonth()+1][now.getDate()][key][_key][__key].length
                        dataSet[num].data.messageCumulative[now.getFullYear()][now.getMonth()+1][now.getDate()][key][_key][__key].forEach(msg => {
                            messageNum = messageNum + msg
                        })
                    });
                });
            });
            let formattedDate = now.getFullYear() + "/" + (now.getMonth() + 1) + "/" + now.getDate() + " " + now.getHours() + ":" + now.getMinutes() + ":" + now.getSeconds();    
            const dateT = new Date(dataSet[num].addTime)
            let formattedDate_ = dateT.getFullYear() + "/" + (dateT.getMonth() + 1) + "/" + dateT.getDate();
            const messageNumAverage = messageNum / messageCumulativeNum
            const embed = new MessageEmbed()
            .setTitle(`本日(${formattedDate})の活気度`)
            .setDescription(`<#${scanChannel.id}>・${formattedDate_}`)
            .setColor('RANDOM')
            embed.addFields([
                {
                    name: "メッセージ数",
                    value: String(messageCumulativeNum)
                },
                {
                    name: "メッセージ文字数",
                    value: String(messageNum)
                },
                {
                    name: "発言平均文字数",
                    value: String(isNaN(messageNumAverage) ? 0 : messageNumAverage)
                }
            ])
            interaction.reply({embeds : [embed]})
        }
    }
    if (interaction.commandName === 'list'){
        if(botSeting.debug){loggerCMD.debug(`[list] in ${interaction.guild.name} by ${interaction.user.username}#${interaction.user.discriminator}`)}
        let page = interaction.options._hoistedOptions.find(data => data.name == "page")
        if(page == undefined){ page = 0 }else{page = page.value-1}//ビジュアルと内部のページ数を合わせるために -1 (プログラム内では0が1ページ目 コマンド上では1ページがそのまま1ページ目)
        let out = []//embedのfildを足して表示する用の array
        const now = new Date()
        let formattedDate = now.getFullYear() + "/" + (now.getMonth() + 1) + "/" + now.getDate();
        {
            let chNum = 0
            dataSet.forEach(data => {
                const channel = interaction.guild.channels.cache.find(channel => channel.id == data.channelId)
                if(channel == undefined) return;
                const shchannel = interaction.guild.channels.cache.find(channel => channel.id == data.channelId)
                let messageCumulativeNum = 0;
                let messageNum = 0;

                if(!(typeof data.data.messageCumulative[now.getFullYear()] === 'object')){
                    data.data.messageCumulative[now.getFullYear()] = {}
                }
                if(!(typeof data.data.messageCumulative[now.getFullYear()][now.getMonth()+1] === 'object')){
                    data.data.messageCumulative[now.getFullYear()][now.getMonth()+1] = {}
                }
                if(!(typeof data.data.messageCumulative[now.getFullYear()][now.getMonth()+1][now.getDate()] === 'object')){
                    data.data.messageCumulative[now.getFullYear()][now.getMonth()+1][now.getDate()] = {}
                }
                if(!(typeof data.data.messageCumulative[now.getFullYear()][now.getMonth()+1][now.getDate()][now.getHours()] === 'object')){
                    data.data.messageCumulative[now.getFullYear()][now.getMonth()+1][now.getDate()][now.getHours()] = {}
                }
                if(!(typeof data.data.messageCumulative[now.getFullYear()][now.getMonth()+1][now.getDate()][now.getHours()][now.getMinutes()] === 'object')){
                    data.data.messageCumulative[now.getFullYear()][now.getMonth()+1][now.getDate()][now.getHours()][now.getMinutes()] = {}
                }

                Object.keys(data.data.messageCumulative[now.getFullYear()][now.getMonth()+1][now.getDate()]).forEach(key => {
                    Object.keys(data.data.messageCumulative[now.getFullYear()][now.getMonth()+1][now.getDate()][key]).forEach(_key => {
                        Object.keys(data.data.messageCumulative[now.getFullYear()][now.getMonth()+1][now.getDate()][key][_key]).forEach(__key => {
                            messageCumulativeNum = messageCumulativeNum + data.data.messageCumulative[now.getFullYear()][now.getMonth()+1][now.getDate()][key][_key][__key].length
                            data.data.messageCumulative[now.getFullYear()][now.getMonth()+1][now.getDate()][key][_key][__key].forEach(msg => {
                                messageNum = messageNum + msg
                            })
                        });
                    });
                });
                chNum++
                const messageNumAverage = messageNum / messageCumulativeNum
                const dateT = new Date(data.addTime)
                let formattedDate = dateT.getFullYear() + "/" + (dateT.getMonth() + 1) + "/" + dateT.getDate() + " " + dateT.getHours() + ":" + dateT.getMinutes() + ":" + dateT.getSeconds();
                out.push(//foreachで回してoutにembedのaddfieldの中身を追加していく
                    {
                        name: `~ ${chNum} ~`,
                        value: `<#${shchannel.id}>・${formattedDate}
                        メッセージ数: ${String(messageCumulativeNum)}
                        メッセージ文字数: ${String(messageNum)}
                        発言平均文字数: ${String(isNaN(messageNumAverage) ? 0 : messageNumAverage)}`
                    }
                )
            
            })
        }

        const embed = new MessageEmbed()
        .setTitle(interaction.guild.name)
        .setDescription(`**本日(${formattedDate})の活気度** - ${page+1} -`)
        .setColor('RANDOM')
        embed.addFields(out.slice(page*4,page*4+4) == "" ? [{name:"このページはありません",value:"/reg でチャンネルを追加"}]:out.slice(page*4,page*4+4))//ページ数分をoutのarrayの中から引き出してembedに入れる
        interaction.reply({embeds : [embed]})      
    }
})
client.login(botSeting.token);