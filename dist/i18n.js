(function(root){
  "use strict";
  const catalogue = {
  "appTitle": [
    "Kingshot · 战术计时助手",
    "Kingshot · Timing Assistant"
  ],
  "description": [
    "让每一支集结准时抵达。Kingshot 集结同步与王城补兵计时助手。",
    "Coordinate rally arrivals and reinforcement windows in Kingshot."
  ],
  "home": [
    "Kingshot 战术计时助手首页",
    "Kingshot Timing Assistant home"
  ],
  "appName": [
    "战术计时助手",
    "Timing Assistant"
  ],
  "tools": [
    "战术工具 / TOOLS",
    "TACTICAL TOOLS"
  ],
  "navigation": [
    "功能导航",
    "Tools"
  ],
  "rally": [
    "集结同步",
    "Rally sync"
  ],
  "rallyNav": [
    "让多个车头同时到达",
    "Arrive together"
  ],
  "guard": [
    "王城补兵",
    "Reinforcements"
  ],
  "guardNav": [
    "抓住两波攻击的间隙",
    "Between enemy attacks"
  ],
  "local": [
    "计算在你的设备上完成",
    "Calculated on your device"
  ],
  "saved": [
    "常用输入自动保存到当前浏览器",
    "Inputs saved in this browser"
  ],
  "tagline": [
    "为每一次配合争取时间",
    "Every second counts"
  ],
  "version": [
    "独立辅助工具 · v0.2",
    "Independent tool · v0.2"
  ],
  "workbench": [
    "作战工作台",
    "Workbench"
  ],
  "soundOn": [
    "♪ 声音已开",
    "♪ Sound on"
  ],
  "soundOff": [
    "♪ 声音已关",
    "♪ Sound off"
  ],
  "focus": [
    "⛶ 专注模式",
    "⛶ Focus"
  ],
  "edit": [
    "↙ 返回编辑",
    "↙ Edit"
  ],
  "language": [
    "语言",
    "Language"
  ],
  "pinOn": [
    "置顶已开",
    "Pinned"
  ],
  "pinOff": [
    "窗口置顶",
    "Pin window"
  ],
  "rallySubtitle": [
    "不同的行军时间，同一刻抵达。",
    "Different march times. One arrival."
  ],
  "example": [
    "填入示例",
    "Load example"
  ],
  "stepAdd": [
    "添加车头",
    "Add leaders"
  ],
  "stepAddHint": [
    "填写准备与行军时长",
    "Enter rally and march times"
  ],
  "stepPlan": [
    "一键排程",
    "Create a plan"
  ],
  "stepPlanHint": [
    "自动计算共同到达时间",
    "Calculate a shared arrival"
  ],
  "stepLaunch": [
    "按提示开车",
    "Launch on cue"
  ],
  "stepLaunchHint": [
    "按顺序查看开车倒计时",
    "Follow each countdown"
  ],
  "roster": [
    "车头名单",
    "Rally leaders"
  ],
  "addLeader": [
    "＋ 添加车头",
    "＋ Add leader"
  ],
  "rosterHint": [
    "每个车头都填上本次到同一目标的行军时间。",
    "Enter each leader’s march time to the same target."
  ],
  "emptyLeader": [
    "先添加一位车头",
    "Add your first leader"
  ],
  "emptyLeaderHint": [
    "输入昵称、准备时长和行军时间，就能开始排程。",
    "Enter a name, rally duration and march time to begin."
  ],
  "firstLeader": [
    "＋ 添加第一位车头",
    "＋ Add first leader"
  ],
  "formats": [
    "时间可填",
    "Time formats:"
  ],
  "or": [
    "或",
    "or"
  ],
  "exampleDecimal": [
    "29.5秒",
    "29.5s"
  ],
  "schedule": [
    "到达安排",
    "Arrival plan"
  ],
  "scheduleMode": [
    "到达安排方式",
    "Arrival mode"
  ],
  "auto": [
    "自动安排",
    "Automatic"
  ],
  "fixed": [
    "指定到达时间",
    "Set arrival time"
  ],
  "leadLabel": [
    "最早开车前留出",
    "Before the first launch"
  ],
  "leadAria": [
    "开车前准备秒数",
    "Lead time in seconds"
  ],
  "leadUnit": [
    "秒准备",
    "s to prepare"
  ],
  "autoHint": [
    "根据最慢的车头，自动选择最近可执行的共同到达时刻。",
    "Uses the longest total duration to find the earliest possible shared arrival."
  ],
  "target": [
    "所有车头的共同到达时刻",
    "Shared arrival date and time"
  ],
  "localTime": [
    "使用当前设备的本地时间，精确到秒。",
    "Uses this device’s local time, including seconds."
  ],
  "generate": [
    "生成开车倒计时",
    "Generate countdowns"
  ],
  "launchCue": [
    "开车指令",
    "LAUNCH CUE"
  ],
  "waitingPlan": [
    "等待排程",
    "Awaiting plan"
  ],
  "readyTogether": [
    "准备好，一起出发",
    "Get ready to rally"
  ],
  "generateHint": [
    "添加车头后，点击「生成开车倒计时」",
    "Add leaders, then select Generate countdowns."
  ],
  "arrival": [
    "共同到达时间",
    "Shared arrival time"
  ],
  "notScheduled": [
    "尚未安排",
    "Not scheduled"
  ],
  "order": [
    "开车顺序",
    "Launch order"
  ],
  "stop": [
    "停止计时",
    "Stop timers"
  ],
  "timelineEmpty": [
    "排程后，这里会显示每位车头的开车时刻。",
    "Each leader’s launch time will appear here."
  ],
  "dirty": [
    "名单或设置已修改。当前仍按原排程计时，重新生成后生效。",
    "Inputs changed. The original plan remains active until you generate a new one."
  ],
  "rallyTipA": [
    "开车时间指",
    "The launch time is when you "
  ],
  "rallyTipB": [
    "发起集结的时刻",
    "start the rally"
  ],
  "rallyTipC": [
    "。请提前打开游戏操作页面，核对本次行军时长。",
    ". Open the game screen in advance and check the current march time."
  ],
  "guardSubtitle": [
    "看准攻击间隙，让援军及时到场。",
    "Send reinforcements between enemy attacks."
  ],
  "stepOwn": [
    "填自己的行军",
    "Your march time"
  ],
  "stepOwnHint": [
    "援军到达王城所需时间",
    "Travel time to the castle"
  ],
  "stepRecord": [
    "记录敌方倒计时",
    "Record enemies"
  ],
  "stepRecordHint": [
    "游戏走到读数时点记录",
    "Click when the game matches"
  ],
  "stepSend": [
    "等待出征提示",
    "Send on cue"
  ],
  "stepSendHint": [
    "援军在两波攻击之间到达",
    "Arrive between attacks"
  ],
  "ownSettings": [
    "你的补兵设置",
    "Your reinforcement settings"
  ],
  "autoApplied": [
    "自动应用",
    "Auto-applied"
  ],
  "ownMarch": [
    "你的行军时间",
    "Your march time"
  ],
  "seconds": [
    "秒",
    "s"
  ],
  "margin": [
    "窗口两端各留容错",
    "Margin on each side"
  ],
  "ownHint": [
    "使用你本次到王城的实际行军时间；容错用来避开攻击到达的边缘。",
    "Use your current march time. Margins keep arrivals away from attack boundaries."
  ],
  "enemies": [
    "敌方集结",
    "Enemy rallies"
  ],
  "addEnemy": [
    "＋ 添加敌方",
    "＋ Add enemy"
  ],
  "enemyHint": [
    "逐队记录，记录后立即计时，无需再点开始。",
    "Record each team. Its timer starts immediately."
  ],
  "emptyEnemy": [
    "先记录两支敌方队伍",
    "Record two enemy teams"
  ],
  "emptyEnemyHint": [
    "有了相邻两波攻击，才能找到中间的补兵窗口。",
    "Two consecutive attacks define a reinforcement window."
  ],
  "firstEnemy": [
    "＋ 添加敌方队伍",
    "＋ Add enemy team"
  ],
  "recalibrate": [
    "校准时重新读取游戏倒计时，只更新当前这一队。",
    "Read the current game countdown before re-recording. Other teams stay unchanged."
  ],
  "sendCue": [
    "补兵指令",
    "REINFORCEMENT CUE"
  ],
  "waitingRecord": [
    "等待记录",
    "Awaiting records"
  ],
  "waitingEnemy": [
    "等待敌方攻击信息",
    "Waiting for enemy attacks"
  ],
  "twoNeeded": [
    "记录至少两支敌方队伍，自动计算出征时机",
    "Record at least two teams to calculate when to send."
  ],
  "sendRange": [
    "你可以出征的时刻",
    "When you can send"
  ],
  "notComputed": [
    "尚未计算",
    "Not calculated"
  ],
  "safeWindow": [
    "安全窗口",
    "Safe window"
  ],
  "attacks": [
    "攻击与补兵窗口",
    "Attacks & windows"
  ],
  "zeroRecords": [
    "0 队已记录",
    "0 teams recorded"
  ],
  "attackEmpty": [
    "每次记录后，自动按预计攻击到达时间排序。",
    "Recorded attacks are sorted by estimated arrival."
  ],
  "guardTipA": [
    "提示的倒计时是",
    "The countdown tells you "
  ],
  "guardTipB": [
    "你点出征的时间",
    "when to send"
  ],
  "guardTipC": [
    "，已扣除你的行军时长。建议提前停在派兵页面。",
    ". Your march time is already deducted. Keep the send screen ready."
  ],
  "saveFooter": [
    "常用输入保存在本机，刷新后请重新记录战况",
    "Inputs are saved locally. Record the battle again after a reload."
  ],
  "clear": [
    "清空当前功能",
    "Reset this tool"
  ],
  "foreground": [
    "实战请保持页面在前台。锁屏或切换应用可能错过声音提醒；实际结果取决于游戏延迟和操作时刻。",
    "Keep the page in front during battle. Backgrounding or locking may delay alerts. Results depend on game and input latency."
  ],
  "noscript": [
    "此计时助手需要启用 JavaScript 才能计算和提醒。",
    "Enable JavaScript to use calculations and alerts."
  ],
  "storageUnavailable": [
    "浏览器未允许本地保存，本次计算仍可正常使用",
    "Local saving is unavailable. You can still use the calculators."
  ],
  "durationS": [
    "{s} 秒",
    "{s} s"
  ],
  "durationMS": [
    "{m}分{s}秒",
    "{m}m {s}s"
  ],
  "leaderName": [
    "车头 {n}",
    "Leader {n}"
  ],
  "enemyName": [
    "敌方 {n}",
    "Enemy {n}"
  ],
  "unnamed": [
    "未命名车头",
    "Unnamed leader"
  ],
  "name": [
    "昵称",
    "Name"
  ],
  "leaderPlaceholder": [
    "车头昵称",
    "Leader name"
  ],
  "enemyPlaceholder": [
    "敌方车头昵称",
    "Enemy leader name"
  ],
  "deleteLeader": [
    "删除车头 {n}",
    "Remove leader {n}"
  ],
  "deleteEnemy": [
    "删除敌方 {n}",
    "Remove enemy {n}"
  ],
  "prepare": [
    "集结准备时长",
    "Rally duration"
  ],
  "march": [
    "到目标的行军时间",
    "March to target"
  ],
  "time": [
    "时间",
    "time"
  ],
  "example35": [
    "例如 35",
    "e.g. 35"
  ],
  "example440": [
    "例如 4:40",
    "e.g. 4:40"
  ],
  "total": [
    "从开集结到到达，共 {time}",
    "Launch to arrival: {time}"
  ],
  "totalHint": [
    "准备时长 + 行军时长 = 开集结到抵达的总时间",
    "Rally duration + march time = total time to arrival"
  ],
  "rowLimit": [
    "每个功能最多添加 30 支队伍",
    "You can add up to 30 teams per tool."
  ],
  "stage": [
    "队伍阶段",
    "Team stage"
  ],
  "gathering": [
    "集结中",
    "Gathering"
  ],
  "marching": [
    "行军中",
    "Marching"
  ],
  "prepareRemaining": [
    "当前集结剩余",
    "Rally time remaining"
  ],
  "marchFull": [
    "出发后完整行军时间",
    "Full march duration"
  ],
  "marchRemaining": [
    "当前剩余行军时间",
    "March time remaining"
  ],
  "unrecorded": [
    "未记录",
    "Not recorded"
  ],
  "recorded": [
    "✓ 已记录",
    "✓ Recorded"
  ],
  "edited": [
    "已修改 · 待重新记录",
    "Edited · re-record to apply"
  ],
  "reading": [
    "所填读数",
    "the entered time"
  ],
  "record": [
    "记录现在",
    "Record now"
  ],
  "rerecord": [
    "重新记录",
    "Record again"
  ],
  "recordLabel": [
    "{action} · 游戏走到 {reading} 时点这里",
    "{action} · click when the game shows {reading}"
  ],
  "recordDetails": [
    "有效记录 {recorded} · 预计攻击 {arrival}{dirty}",
    "Recorded {recorded} · attack {arrival}{dirty}"
  ],
  "usingPrevious": [
    "（仍按上次记录计算）",
    " (using the previous record)"
  ],
  "marchHelp": [
    "敌方已出发，只需填写当前剩余行军时间。",
    "Already marching? Enter only the current remaining march time."
  ],
  "recordHelp": [
    "先填写读数，再在游戏倒计时走到这个读数时点击。",
    "Enter a reading, then click when the game countdown matches it."
  ],
  "recordCount": [
    "{n} 队已记录",
    "{n} teams recorded"
  ],
  "attackArrival": [
    "预计攻击到达",
    "Estimated attack arrival"
  ],
  "availableGap": [
    "可补兵 · 安全间隔",
    "Safe reinforcement gap"
  ],
  "insufficientGap": [
    "无法补兵 · 间隔不足",
    "Gap too short"
  ],
  "noSafeWindow": [
    "无安全窗口",
    "No safe window"
  ],
  "needOneMore": [
    "再记录一支队伍，就能计算两波攻击之间的窗口。",
    "Record one more team to calculate the gap between attacks."
  ],
  "rowDurations": [
    "准备 {prepare} · 行军 {march}",
    "Rally {prepare} · march {march}"
  ],
  "launchNow": [
    "现在开集结",
    "Launch now"
  ],
  "launchSoon": [
    "准备开车",
    "Get ready"
  ],
  "planActive": [
    "排程进行中",
    "Plan active"
  ],
  "nextGroup": [
    "下一组 · {names}",
    "Next · {names}"
  ],
  "launch": [
    "开集结",
    "Launch"
  ],
  "launchInstruction": [
    "请现在在游戏中发起集结",
    "Start the rally in the game now."
  ],
  "launchAt": [
    "到 {time} 发起集结",
    "Start your rally at {time}"
  ],
  "allLaunched": [
    "已到所有开车时刻",
    "All launch times reached"
  ],
  "arrivalIn": [
    "距离共同到达",
    "Until shared arrival"
  ],
  "checkLaunched": [
    "请在游戏中确认各队已出发",
    "Check in the game that all teams have departed."
  ],
  "roundOver": [
    "本轮计时结束",
    "Round complete"
  ],
  "arrivalReached": [
    "已到共同到达时刻",
    "Shared arrival time reached"
  ],
  "arrived": [
    "已抵达时刻",
    "Arrival due"
  ],
  "newPlan": [
    "继续配合时，请重新生成排程",
    "Generate a new plan for the next round."
  ],
  "launchIn": [
    "{time} 后开车",
    "Launch in {time}"
  ],
  "launchPassed": [
    "已到开车时刻",
    "Launch time reached"
  ],
  "sendNow": [
    "现在出征",
    "Send now"
  ],
  "sendOpen": [
    "已进入出征窗口",
    "Send window open"
  ],
  "sendSoon": [
    "准备出征",
    "Get ready to send"
  ],
  "waitingSend": [
    "等待出征",
    "Waiting to send"
  ],
  "between": [
    "{before} → {after} 之间补兵",
    "Reinforce between {before} → {after}"
  ],
  "sendLeft": [
    "还剩 {time} 可出征",
    "{time} left to send"
  ],
  "sendAt": [
    "倒计时结束时点出征 · 建议 {time}",
    "Send at zero · suggested {time}"
  ],
  "needAnother": [
    "还差一支敌方队伍",
    "One more enemy team needed"
  ],
  "needAnotherHint": [
    "再记录一队，才能找到两波攻击之间的窗口",
    "Record another team to find a window between attacks."
  ],
  "noWindow": [
    "暂无可用窗口",
    "No available window"
  ],
  "missed": [
    "已错过可用的出征窗口",
    "Send windows have passed"
  ],
  "missedHint": [
    "这些攻击之间已来不及补兵，请记录后续敌方队伍",
    "It is too late to reinforce between these attacks. Record later teams."
  ],
  "gapShort": [
    "攻击间隔不足",
    "Attacks are too close"
  ],
  "gapShortHint": [
    "扣除两端容错后没有安全间隔，请等待后续攻击",
    "No safe gap remains after margins. Wait for later attacks."
  ],
  "noTime": [
    "尚无可用时刻",
    "No available time"
  ],
  "attackIn": [
    "{time} 后攻击",
    "Attack in {time}"
  ],
  "attackPassed": [
    "已到攻击时刻",
    "Attack time reached"
  ],
  "applied": [
    "已自动应用",
    "Applied"
  ],
  "notApplied": [
    "修改未生效",
    "Not applied"
  ],
  "oldSettings": [
    "当前仍按上次有效设置计算。",
    "The previous valid settings remain active."
  ],
  "oldRecord": [
    "已保留上次有效记录。",
    "The previous valid record is preserved."
  ],
  "oldPlan": [
    "当前排程未改变。",
    "The current plan is unchanged."
  ],
  "deleteConfirm": [
    "删除这支队伍？正在计时的信息可能受影响。",
    "Remove this team? Active timing information may be affected."
  ],
  "recordToast": [
    "{name} 已记录，预计 {time} 攻击",
    "{name} recorded. Estimated attack: {time}"
  ],
  "planToast": [
    "排程已生成，按开车顺序查看倒计时",
    "Plan generated. Follow the countdowns in launch order."
  ],
  "stopConfirm": [
    "停止本轮集结计时？车头名单会保留。",
    "Stop this rally plan? Your leader list will be kept."
  ],
  "noAudio": [
    "此浏览器不支持声音提醒，请查看页面提示",
    "Audio alerts are unavailable. Follow the visual cues."
  ],
  "rallyExampleConfirm": [
    "用示例替换当前车头名单并停止本轮集结计时？",
    "Replace the current leaders with examples and stop the active plan?"
  ],
  "rallyExampleToast": [
    "已填入示例，点击「生成开车倒计时」体验",
    "Examples loaded. Select Generate countdowns to try them."
  ],
  "guardExampleConfirm": [
    "用示例替换当前敌方名单，并清除已记录战况？",
    "Replace enemy teams with examples and clear recorded attacks?"
  ],
  "guardExampleToast": [
    "已填入示例，请依次点击两队的「记录现在」",
    "Examples loaded. Select Record now for each team."
  ],
  "clearConfirm": [
    "清空{tool}的名单和计时，并恢复该功能的默认设置？",
    "Clear {tool} teams and timers, and restore its defaults?"
  ],
  "cleared": [
    "当前功能已清空",
    "This tool has been reset."
  ],
  "invalidTime": [
    "请输入有效时间，例如 5:00、35 或 29.5（最多 7 天）",
    "Enter a valid duration, such as 5:00, 35 or 29.5 (up to 7 days)."
  ],
  "positiveTime": [
    "请输入大于 0 的时间，例如 35 或 0:35（最多 7 天）",
    "Enter a duration above zero, such as 35 or 0:35 (up to 7 days)."
  ],
  "noLeaders": [
    "请先添加车头",
    "Add a leader first."
  ],
  "invalidTarget": [
    "请选择完整的到达日期和时间",
    "Choose a complete arrival date and time."
  ],
  "tooLate": [
    "这个到达时间已经来不及了，请往后调整，或使用自动安排",
    "That arrival time is too soon. Choose a later time or use Automatic."
  ],
  "rowError": [
    "{name}：{reason}",
    "{name}: {reason}"
  ],
  "sleepReset": [
    "设备已休眠或系统时钟发生跳变，实战计时已停止。请重新排程或记录。",
    "The device slept or its clock changed. Live timers were stopped. Generate or record again."
  ],
  "desktopHint": [
    "桌面版已启用后台计时；休眠后需重新记录战况。",
    "Desktop background timing is enabled. Record again after sleep."
  ],
  "desktopError": [
    "桌面功能暂不可用，请重试。",
    "Desktop action unavailable. Please try again."
  ]
};

  let language = 'zh-CN';
  function choose(preferred) { return /^zh(?:-|$)/i.test(preferred || '') ? 'zh-CN' : 'en'; }
  function translate(key, params = {}, locale = language) {
    const pair = catalogue[key];
    if (!pair) throw new Error('Missing translation: ' + key);
    const template = pair[locale === 'en' ? 1 : 0] || pair[0];
    return template.replace(/\{(\w+)\}/g, (_, name) => String(params[name] ?? '{'+name+'}'));
  }
  function apply() {
    document.documentElement.lang = language;
    document.querySelectorAll('[data-i18n]').forEach(el => el.textContent = translate(el.dataset.i18n));
    for (const attr of ['aria-label','content','placeholder']) document.querySelectorAll('[data-i18n-'+attr+']').forEach(el => el.setAttribute(attr, translate(el.getAttribute('data-i18n-'+attr))));
    document.title = translate('appTitle');
  }
  const api = {catalogue, choose, t:translate, apply, get language(){return language;}, setLanguage(value){language=choose(value);}, number(value){return new Intl.NumberFormat(language,{maximumFractionDigits:2}).format(value);}};
  if (typeof module !== 'undefined' && module.exports) module.exports=api; else root.KingshotI18n=api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
