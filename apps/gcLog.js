import plugin from "../../../lib/plugins/plugin.js"
import fs from "node:fs"
import GachaLog from "../model/gachaLog.js"
import LogCount from "../model/logCount.js"
import ExportLog from "../model/exportLog.js"

const _path = process.cwd() + "/plugins/genshin"

export class gcLog extends plugin {
  constructor() {
    super({
      name: "抽卡记录",
      dsc: "抽卡记录数据统计",
      event: "message",
      priority: 300,
      rule: [
        {
          reg: "(.*)authkey=(.*)",
          fnc: "logUrl",
        },
        {
          reg: "^#?(原神|星铁)?(强制)?导入记录(json)?$",
          fnc: "logJson",
        },
        {
          reg: "^#?(原神|星铁)?(全部)?(抽卡|抽奖|角色|角色联动|武器|武器联动|集录|常驻|up|新手|光锥|光锥联动|全部)池*(记录|祈愿|分析)$",
          fnc: "getLog",
        },
        {
          reg: "^#?(原神|星铁)?(强制)?导出记录(json)?(v2|v4)?$",
          fnc: "exportLog",
        },
        {
          reg: "^#?(记录帮助|抽卡帮助)$",
          fnc: "help",
        },
        {
          reg: "^#?(安卓|苹果|电脑|pc|ios)帮助$",
          fnc: "helpPort",
        },
        {
          reg: "^#?(原神|星铁)?(抽卡|抽奖|角色|武器|集录|常驻|up|新手|光锥)池*统计$",
          fnc: "logCount",
        },
        {
          // #设置全量更新抽卡记录
          reg: "^#?设置全量(更新|获取)(抽卡|祈愿)记录\s*(开|关|on|off)?$",
          fnc: "setFetchFullLog",
        },
      ],
    })

    this.androidUrl = "https://docs.qq.com/doc/DUWpYaXlvSklmVXlX"
    Object.defineProperty(this, "button", {
      get() {
        this.prefix = this.e?.isSr ? "*" : "#"
        return segment.button(
          [
            { text: "角色记录", callback: `${this.prefix}角色记录` },
            { text: "角色统计", callback: `${this.prefix}角色统计` },
          ],
          [
            { text: "武器记录", callback: `${this.prefix}武器记录` },
            { text: "武器统计", callback: `${this.prefix}武器统计` },
          ],
          [
            { text: "角色联动记录", callback: `${this.prefix}角色联动记录` },
            { text: "角色联动统计", callback: `${this.prefix}角色联动统计` },
          ],
          [
            { text: "武器联动记录", callback: `${this.prefix}武器联动记录` },
            { text: "武器联动统计", callback: `${this.prefix}武器联动统计` },
          ],
          [
            { text: "集录记录", callback: `${this.prefix}集录记录` },
            { text: "集录统计", callback: `${this.prefix}集录统计` },
          ],
          [
            { text: "常驻记录", callback: `${this.prefix}常驻记录` },
            { text: "常驻统计", callback: `${this.prefix}常驻统计` },
          ],
        )
      },
    })
  }

  async init() {
    let file = ["./data/gachaJson", "./data/srJson", "./temp/html/StarRail", "./temp/uigf"]
    for (let i of file) {
      if (!fs.existsSync(i)) {
        fs.mkdirSync(i)
      }
    }
  }

  accept() {
    if (this.e.msg && /^#?(角色|武器)统计$/g.test(this.e.msg)) {
      this.e.msg = this.e.msg.replace("统计", "池统计")
      return true
    }
  }

  /** 抽卡记录链接 */
  async logUrl() {
    let data = await new GachaLog(this.e).logUrl()
    if (!data) return

    await this.renderImg("genshin", `html/gacha/gacha-log`, data)

    if (this.e.isGroup) this.e.reply("已收到链接，请撤回", false, { at: true })
  }

  /** #抽卡记录 */
  async getLog() {
    this.e.isAll = !!this.e.msg.includes("全部")
    let data = await new GachaLog(this.e).getLogData()
    if (!data) return
    let name = `html/gacha/gacha-log`
    if (this.e.isAll) {
      name = `html/gacha/gacha-all-log`
    }
    this.reply([await this.renderImg("genshin", name, data, { retType: "base64" }), this.button])
  }

  /** 导出记录 */
  exportLog() {
    if (this.e.isGroup && !this.e.msg.includes("强制")) {
      return this.reply(
        `建议私聊导出，若你确认要在此导出，请发送【${this.e.game === "sr" ? "*" : "#"}强制导出记录】`,
        false,
        { at: true },
      )
    }
    if (this.e.msg.includes("v2")) {
      this.e.uigfver = "v2"
    } else {
      this.e.uigfver = "v4"
    }
    return new ExportLog(this.e).exportJson()
  }

  logJson() {
    if (this.e.isGroup && !this.e.msg.includes("强制")) {
      return this.reply(
        `建议私聊导入，若你确认要在此导入，请发送【${this.e.game === "sr" ? "*" : "#"}强制导入记录】`,
        false,
        { at: true },
      )
    }

    this.setContext("logJsonFile")
    return this.reply("请发送Json文件")
  }

  async logJsonFile() {
    if (!this.e.file) return false

    this.finish("logJsonFile")
    await new ExportLog(this.e).logJson()

    if (this.e.isGroup) this.reply("已收到文件，请撤回", false, { at: true })
  }

  help() {
    this.e.reply([
      segment.image(`file://${_path}/resources/logHelp/记录帮助.png`),
      segment.button([
        { text: "电脑", callback: "#电脑帮助" },
        { text: "安卓", callback: "#安卓帮助" },
        { text: "苹果", callback: "#苹果帮助" },
      ]),
    ])
  }

  helpPort() {
    let msg = this.e.msg.replace(/#|帮助/g, "")

    if (["电脑", "pc"].includes(msg)) {
      this.e.reply(segment.image(`file://${_path}/resources/logHelp/记录帮助-电脑.png`))
    } else if (["安卓"].includes(msg)) {
      this.e.reply(`安卓抽卡记录获取教程：${this.androidUrl}`)
    } else if (["苹果", "ios"].includes(msg)) {
      this.e.reply(segment.image(`file://${_path}/resources/logHelp/记录帮助-苹果.png`))
    }
  }

  async logCount() {
    let data = await new LogCount(this.e).count()
    if (!data) return

    this.reply([
      await this.renderImg("genshin", `html/gacha/log-count`, data, { retType: "base64" }),
      this.button,
    ])
  }

  async setFetchFullLog() {
    let isOff = this.e.msg.includes("关") || this.e.msg.includes("off")
    await new GachaLog(this.e).setFetchFullLog(!isOff)
  }
}
