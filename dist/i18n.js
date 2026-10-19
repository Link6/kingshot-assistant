(function(root){
  "use strict";
  const catalogue = {
  "counterTitle":["反集结 · 卡点抢回","Counter rally · timed recapture"],
  "counterHelp":["选择敌方攻击落点，倒推我方发起时间。支持已有车头或新增车头；本轮选择独立于进攻车头启停。","Choose an enemy impact and work backwards to your launch. Reuse or add leaders; counter selection is independent of the attack roster."],
  "counterEnemy":["跟随哪一波敌方攻击","Enemy attack to follow"],
  "counterLeader":["我方反集结车头","Our counter rally leader"],
  "counterNewLeader":["＋ 新增车头并保留资料","＋ Add and retain a new leader"],
  "counterOffset":["在敌方到达后多少秒命中","Hit this many seconds after the enemy"],
  "counterInitialMode":["我方当前状态","Our current state"],
  "counterPlanMode":["尚未发起，计算开车时间","Not started — plan launch"],
  "counterGatherMode":["已在集结，录入剩余时间","Gathering — enter remaining time"],
  "counterMarchMode":["已在行军，录入剩余时间","Marching — enter remaining time"],
  "counterReading":["游戏剩余读数（分:秒或秒）","Game time remaining (m:ss or seconds)"],
  "counterSave":["生成／记录反集结","Plan / record counter rally"],
  "counterPrecision":["偏移需由指挥决定；0.1 秒是显示与校准步长，不代表游戏执行精度。录入读数后，等游戏显示到该读数时点击。","The commander chooses the offset. 0.1s is a display and adjustment step, not guaranteed game precision. Click when the game reaches the reading entered."],
  "counterAfter":["敌方到达后 {seconds} 秒","{seconds}s after enemy arrival"],
  "counterTarget":["目标命中时间","Target impact"],
  "counterDrift":["偏差（负数提前，正数延后）","Difference (negative early, positive late)"],
  "counterCalibration":["校准实际集结／行军","Calibrate gathering / march"],
  "counterRecordReading":["记录现在的游戏读数","Record current game reading"],
  "counterRebase":["按最新资料重新对齐","Realign with latest information"],
  "counterRestart":["重新排程","Schedule again"],
  "counterRebaseHelp":["敌方或车头资料变更后需重新核对。尚未发起时重新计算开车；已记录实际进度时保留实际发起时刻，仅更新目标和资料。","Review changes to enemy or leader data. Realignment replans unstarted rallies; observed rallies retain their actual launch while updating target and details."],
  "counterCancel":["停止本次反集结","Stop this counter rally"],
  "counterEmpty":["先记录敌方攻击，再选择我方车头安排反集结。","Record an enemy attack, then choose a leader for a counter rally."],
  "counterStopped":["反集结已停止","Counter rally stopped"],
  "counterNeedsReview":["需要指挥重新核对","Commander review needed"],
  "counterMissed":["已错过计划开车时间","Planned launch missed"],
  "counterMissedHelp":["若游戏里已经发起，请录入实际集结或行军剩余时间；否则重新排程。","If already started in game, record gathering or march time remaining. Otherwise reschedule."],
  "counterSourceChanged":["基准敌方已修改、重新记录或停止；实际进度保持，请指挥核对目标。","The reference enemy was changed, re-recorded or stopped. Actual progress is retained; review the target."],
  "counterLeaderChanged":["车头资料已变更；请核对实际行军并重新校准。","Leader details changed. Check the actual march and recalibrate."],
  "counterNextThreat":["注意：预计命中前还有敌方 {name} 到达。","Warning: enemy {name} is expected to arrive before this counter hits."],
  "counterEnemyMissing":["请选择仍有效的敌方攻击。","Choose an active enemy attack."],
  "counterTooLate":["已来不及按此目标新开集结。若已在集结／行军，请选择相应状态并记录剩余时间。","Too late to start a new rally for this target. If already gathering or marching, select that state and record remaining time."],
  "counterNeedsDefend":["请先由指挥切换到防守模式。","Switch to defense mode first."],
  "counterTimeline":["反集结","Counter rally"],
  "counterPlannedTarget":["计划目标","Planned target"],
  "counterOwnInstruction":["按自己的反集结倒计时行动；用游戏实际进度校准。","Follow your counter rally timer and calibrate against the game."],
  "leaderEnabled":["已启用","Enabled"],
  "leaderDisabled":["已停用","Disabled"],
  "leaderEnable":["启用","Enable"],
  "leaderDisable":["停用","Disable"],
  "leaderDisabledHint":["资料已保留，本轮不参与集结；启用后重新生成／发布排程即可加入。","Details retained. Excluded from this rally; enable and generate/publish a new schedule to include this leader."],
  "roomResumeOwned":["找回我创建的房间","Recover my hosted room"],
  "roomNoOwned":["没有找到你创建的有效房间，可以创建新房间。","You do not host an active room. You can create a new one."],
  "roomOwnedRecovered":["已找回你原来创建的房间。可以继续使用，或点击“关闭房间”后再创建。","Your hosted room has been recovered. Continue using it, or close it before creating another."],
  "roomBackLocal":["返回本地（保留房间）","Back to local tools (keep room)"],
  "roomBackRetained":["已返回本地，服务器房间仍保留。登录后可找回原房间继续使用或关闭。","Back in local tools. The server room is still active. Recover it after login to continue or close it."],
  "roomClosed":["服务器上的房间已关闭或已过期，可以重新创建。","The server room is closed or expired. You can create another."],
  "roomLeft":["已离开房间。","You have left the room."],
  "roomCloseFailed":["未收到服务器关闭成功的确认，原房间资料已保留。请检查网络后重试“关闭房间”；返回本地不会关闭服务器房间。","Server closure was not confirmed. Your room details are retained. Check the network and retry Close room; returning to local tools does not close the server room."],
  "roomTimelineAttackHint":["逐队对照发起、集结和行军进度；完整显示校准后相邻到达之间的间隙，不扣除误差。自己的车头高亮显示。","Compare each leader's launch, gathering and march. Full gaps between calibrated arrivals are shown without margins. Your own leader row is highlighted."],
  "attackGapDetail":["{before} → {after} · 存在敌方补兵驻防时间间隙：{seconds} 秒 · {start} → {end}","{before} → {after} · Enemy reinforcement/garrison gap exists: {seconds}s · {start} → {end}"],
  "noArrivalGap":["无到达间隙","No arrival gap"],
  "roomDefenseMargin":["防守补兵窗口两端各留容错（秒）","Defense reinforcement margin at each end (seconds)"],
  "roomTimelineDefenseHint":["普通出征、加速出征和援军到达分开显示。窗口已扣除两端容错；加速道具数量和顺序见下方方案。","Normal launch, boosted launch and reinforcement arrival have separate tracks. End margins are deducted. See item counts and order in the advice below."],
  "roomTimelineRange":["显示范围","Time range"],
  "roomTimelineAuto":["自动","Auto"],
  "roomTimelineMinutes":["未来 {n} 分钟","Next {n} minutes"],
  "roomTimelineSeconds":["未来 {n} 秒","Next {n} seconds"],
  "roomTimelineGather":["集结准备","Gathering"],
  "roomTimelineMarch":["行军","March"],
  "roomTimelineLaunch":["发起集结","Rally launch"],
  "roomTimelineLanding":["集结到达","Rally arrival"],
  "roomTimelineGaps":["到达间隙","Arrival gaps"],
  "roomTimelineNormal":["普通出征","Normal launch"],
  "roomTimelineBoost":["加速出征","Boosted launch"],
  "roomTimelineOwn":["我的车头","My leader"],
  "roomTimelineDetail":["点击色带或时间点查看完整 UTC 时刻和对应队伍。","Select a band or marker to see the full UTC times and teams."],
  "roomTimelineStatus":["{time} · 未来 {seconds} 秒内 {n} 队到达","{time} · {n} arrivals in the next {seconds} seconds"],
  "roomTimelineLater":["最近一次到达还需 {time}，缩小或扩大范围可调整视野。","Next arrival in {time}. Change the range to adjust the view."],
  "roomTimelineFinished":["本轮记录均已到达，等待新的排程或敌方记录。","All arrivals in this round have passed. Waiting for a new plan or enemy records."],
  "roomTimelinePaused":["同步已暂停，时间轴保留最后状态；恢复同步后继续。","Sync is paused. The timeline holds its last state until synchronization resumes."],
  "roomTimelineStale":["排程待重新发布，时间轴暂停，请按指挥更新后的安排执行。","The plan needs republishing. The timeline is paused until the commander updates it."],
  "roomTimelineStandby":["当前待命，等待指挥切换作战模式。","Standing by until the commander selects an operation."],
  "roomTimelinePhaseDetail":["{name} · {phase} · {start} → {end}","{name} · {phase} · {start} → {end}"],
  "roomTimelinePointDetail":["{name} · {kind} · {time}","{name} · {kind} · {time}"],
  "boostTitle":["补兵窗口与道具分析","Reinforcement windows and march items"],
  "boostHint":["普通行军赶不上时，仍保留可加速到达的窗口。推荐最少件数，同件数优先少用 50% 道具。","Arrival windows remain visible when items can rescue a late march. Recommendations use the fewest items, preferring fewer 50% items when counts tie."],
  "boostAssumption":["按尚未出征估算：出征前及每件道具操作各预留 {delay} 秒，可在下方修改。","Estimates a march you have not launched yet: allows {delay} seconds before launch and before each item. Adjust below."],
  "boostSettings":["道具库存与操作预留","Item availability and operation time"],
  "boostStock":["计划可用的 {percent}% 道具数量","Available {percent}% items"],
  "boostUnlimited":["留空不限，0 表示不用","Blank: unlimited; 0: exclude"],
  "boostDelay":["出征前及每次道具操作预留（秒）","Time before launch and each item (seconds)"],
  "boostSettingsHint":["仅本机保存。库存留空不限，填 0 排除该类道具。默认出征前预留 1 秒，每件道具操作再预留 1 秒。每件扣减使用时的剩余行军时间，多件逐次相乘。","Saved in this browser. Leave stock blank for unlimited; 0 excludes that item. Defaults to 1 second before launch and another 1 second before each item. Each item reduces the then-remaining march time; reductions multiply."],
  "boostInvalid":["道具数量填 0–9999 的整数或留空；操作预留填 0.1–30 秒。","Enter an item count of 0–9999 or leave it blank, and 0.1–30 seconds for operation time."],
  "boostCount":["{percent}% × {n}","{percent}% × {n}"],
  "boostNoItems":["无需道具","No items needed"],
  "boostNormal":["普通行军可达","Reachable without items"],
  "boostReachable":["加速可赶上","Reachable with items"],
  "boostCannotReach":["当前方案来不及","Not reachable with these settings"],
  "boostRecommend":["推荐：{items}","Recommended: {items}"],
  "boostTravel":["预计出征后 {seconds} 秒到达（含道具操作）","About {seconds} seconds after launch, including item operations"],
  "boostDepart":["出征区间","Launch interval"],
  "boostReady":["预留操作后可出征","After the launch allowance"],
  "boostLatest":["最迟出征还剩","Time until latest launch"],
  "boostSequence":["出征后第 {delay} 秒用第一件，之后每隔 {delay} 秒用下一件；顺序：{items}。提前或延后使用会改变到达时间，请核对游戏读数。","Use the first item {delay} seconds after launch, then the next every {delay} seconds. Order: {items}. Earlier or later use changes arrival time; check the game reading."],
  "boostAlternatives":["其他可用组合（按当前时刻估算）","Other feasible combinations at this moment"],
  "boostUnavailable":["到达窗口仍在，但按当前库存和操作预留无法赶上。","The arrival window is still open, but current stock and operation time cannot reach it."],
  "boostFinished":["这些到达窗口已结束，等待后续敌方攻击。","These arrival windows have ended. Waiting for more enemy attacks."],
  "boostPaused":["同步断开或行军尚未确认，暂停加速建议。","Item advice is paused until synchronization and march confirmation are ready."],
  "boostHeroInstruction":["倒计时为最迟出征时间。普通行军已来不及，需要 {items}；按下方出征区间操作，再在行军中使用道具。","The countdown is to the latest launch. A normal march is too late; use {items}. Launch within the interval below, then apply the items during the march."],
  "prepareMinuteSecond":["集结剩余（分:秒）","Rally remaining (min:sec)"],
  "minuteSecondUnit":["分:秒","min:sec"],
  "enemyArrivalIn":["距离攻击到达","Until attack arrival"],
  "enemyStop":["停止计时","Stop timer"],"enemyStopped":["已停止","Stopped"],
  "enemyRecordAgain":["重新记录","Record again"],
  "enemyStopHint":["本队已停止，不参与补兵窗口。敌方重新发起后，请重新读取并记录倒计时。","This attack is stopped and excluded from reinforcement windows. Read and record a fresh countdown when the enemy starts again."],
  "battleRoom":["房间作战","Battle room"],
  "roomEntryHint":["登录并进入房间后，将切换到独立作战界面，由房主或指挥统一下达指令。","Enter a room to open a separate battle interface controlled by the host and commanders."],
  "myOrder":["我的行动","My action"],
  "myMarch":["我的行军时间","My march time"],
  "marchOnlyHint":["行军时间会保留，读数改变时再保存。指挥要求核对时，读数没变可直接确认，无需重填。","Your march time is retained. Save it when it changes. If a commander requests a check, confirm the existing value when it is unchanged."],
  "confirmMarch":["保存／确认行军时间","Save / confirm march time"],
  "roomPetTitle":["我的宠物 · 预计计时","My pet · estimated timer"],
  "roomPetHelp":["按 2 小时估算，填已开启多久；填 0 表示现在开启。仅本人在当前浏览器保存，刷新会保留。开关宠物后，如行军读数变化再更新行军。","Estimates a 2-hour duration. Enter how many minutes it has been active; 0 starts now. Saved for your account in this browser across reloads. Update your march if activating or ending the pet changes it."],
  "roomPetElapsed":["宠物已开启（分钟）","Minutes pet has been active"],
  "roomPetStart":["保存宠物时间","Save pet time"],"roomPetUpdate":["更新我的宠物时间","Update my pet time"],
  "roomPetSoon":["预计不足 5 分钟，留意宠物结束后的行军读数。","About 5 minutes or less left. Check your march reading when the pet ends."],
  "roomPetExpired":["宠物预计已结束，可手动更新宠物时间或标记结束。","The pet is estimated to have ended. Update its time or mark it ended."],
  "roomPetMarchReview":["宠物状态可能变化，请看一下游戏行军读数；未变化无需重新保存。","Your pet status may have changed. Check the game's march reading; no need to save again if it is unchanged."],
  "marchChecked":["行军已确认","March confirmed"],
  "marchNeedsCheck":["请核对本次行军时间，并点击“更新并确认”。","Check your march time for this target, then update and confirm."],
  "commandConsole":["指挥台","Command console"],
  "battleHold":["待命","Stand by"],
  "battleAttackMode":["进攻集结","Rally attack"],
  "battleDefend":["防守补兵","Reinforce defense"],
  "requestMarchCheck":["要求重新核对行军","Request march check"],
  "commandNote":["全员指令","Message to the room"],
  "broadcastCommand":["发布指令","Broadcast command"],
  "publishRally":["发布全房间集结排程","Publish rally schedule"],
  "publishRallyHint":["发布前请让车头确认行军。留空到达时刻则自动安排；重新发布会替换本轮排程。","Leaders must confirm their march times first. Leave arrival blank for automatic scheduling. Publishing replaces the current round."],
  "optionalArrivalLocal":["指定共同到达时刻（本地时间，可不填）","Optional common arrival (local time)"],
  "landingAnalysis":["集结到达与间隙分析","Rally arrivals and gaps"],
  "landingAnalysisHint":["按校准后的预计到达排序，完整显示相邻集结之间的间隙，不扣除误差。","Sorted by calibrated estimated arrival. Full gaps between rallies are shown without margins."],
  "sharedPlanStale":["车头或集结准备已变更，当前行动提示已暂停，请指挥重新发布排程。","Leaders or preparation times changed. Action cues are paused until a commander publishes a new schedule."],
  "sharedArrivalTarget":["原定共同到达：{time}","Planned common arrival: {time}"],
  "manageRallyLeaders":["管理车头和集结准备时间","Manage leaders and preparation"],
  "manageEnemies":["记录或重新校准敌方","Record or recalibrate enemies"],
  "defenseHint":["指挥维护敌方倒计时；补兵窗口按每位成员确认的行军时间分别计算。","Commanders maintain enemy readings. Each member gets reinforcement windows based on their confirmed march time."],
  "myReinforcementWindows":["我的补兵窗口与道具方案","My reinforcement windows and items"],
  "roomMemberList":["房间成员与行军核对","Members and march checks"],
  "calibrated":["已校准发起时刻","Launch calibrated"],
  "estimatedLaunch":["按排程估计","Scheduled estimate"],
  "rallyLaunchTime":["发起集结时刻","Rally launch time"],
  "orderDurations":["集结 {prepare} 秒 · 行军 {march} 秒","Preparation {prepare}s · March {march}s"],
  "calibrateLaunch":["校准实际发起时间","Calibrate actual launch"],
  "calibrateHint":["晚开就加时间，早开就减时间。仅调整当前车头，预计到达和间隙随之更新。","Add time for a late launch, subtract for an early one. Only this leader changes; arrival estimates and gaps update with it."],
  "launchObservedNow":["记录现在已发起","Record launch now"],
  "actualLaunchLocal":["实际发起时刻（设备本地时间）","Actual launch (device local time)"],
  "applyLaunchTime":["应用发起时刻","Apply launch time"],
  "launchCountdown":["发起集结倒计时","Rally launch countdown"],
  "gapNeedTwo":["至少两位已排程车头，才能分析到达间隙。","Schedule at least two leaders to analyze landing gaps."],
  "landingGap":["到达间隔 {seconds} 秒","Landing gap {seconds}s"],
  "insertionWidth":["存在敌方补兵驻防时间间隙：{seconds} 秒","Enemy reinforcement/garrison gap exists: {seconds}s"],
  "noInsertionWindow":["不存在敌方补兵驻防时间间隙","No enemy reinforcement/garrison gap"],
  "waitPublishedPlan":["等待指挥发布排程","Waiting for a published schedule"],
  "waitCommander":["保持待命，等待指挥下一步指令。","Stand by for the next command."],
  "checkMarchFirst":["先核对行军时间","Confirm march time first"],
  "leaderActionHint":["按显示时刻发起集结。实际开车有误差时，请指挥校准这一队。","Launch at the displayed time. Ask a commander to calibrate this rally if the actual launch differs."],
  "joinRallyNow":["加入集结","Join a rally"],
  "joinRallyHint":["当前可跟车：{names}。按指挥指令加入目标集结。","Rallies gathering: {names}. Join the target rally specified by your commander."],
  "prepareToJoin":["准备跟车","Prepare to join"],
  "followCommander":["你是 joiner，无需发起集结。按指挥指令选择车头跟车。","You are a joiner. Follow the commander and join the assigned leader’s rally."],
  "leadersNeedMarchCheck":["请先让所有已选车头核对并确认行军时间。","Ask all selected leaders to confirm their march times first."],
  "delete":["删除","Delete"],
  "roomTitle":["房间协作","Room collaboration"],
  "roomIntro":["仅限指定 Discord 服务器成员。房主和指挥管理车头、集结时间和敌方；队友只需更新自己的行军时间。","For members of the approved Discord server. Hosts and commanders manage rally leaders, preparation times and enemies; teammates only update their own march times."],
  "roomLogin":["使用 Discord 登录","Sign in with Discord"],"roomLogout":["退出登录","Sign out"],
  "roomNick":["游戏昵称","In-game name"],"roomCreate":["创建房间","Create room"],"roomJoin":["加入房间","Join room"],
  "roomCodeLabel":["8 位房间码","8-character room code"],"roomCopy":["复制房间码","Copy room code"],
  "roomPrepare":["我的集结准备（秒）","My rally preparation (seconds)"],"roomMarch":["我到目标的行军（秒）","My march to target (seconds)"],
  "roomSaveSelf":["更新我的行军时间","Update my march time"],"roomEnemyTitle":["指挥：记录并共享敌方","Commanders: record and share enemies"],
  "roomJoinerHint":["加入房间默认是 joiner。只有房主或指挥选中的车头会参与集结排程。","Members join as joiners. Only leaders selected by the host or a commander enter the rally schedule."],
  "roomLeaderTitle":["车头名单 / Rally leaders","Rally leaders"],
  "roomLeaderHint":["房主和指挥选择车头并更新集结准备时间。关联成员的行军时间由本人更新；未进房间的车头可手动添加。","Hosts and commanders select leaders and set preparation times. Linked members supply their own march times; leaders outside the room can be added manually."],
  "roomLeaderSource":["选择成员或手动添加","Select a member or add manually"],"roomLeaderManual":["手动添加车头","Add leader manually"],
  "roomLeaderPrepare":["集结准备（秒）","Rally preparation (seconds)"],
  "roomLeaderMarchHint":["关联成员的行军时间由本人共享，无需指挥填写。","Linked members share their own march times. Commanders do not need to enter them."],
  "roomLeaderAdd":["添加车头","Add leader"],"roomLeaderSave":["保存车头设置","Save leader settings"],
  "roomLeaderCancel":["取消编辑","Cancel editing"],"roomLeaderEdit":["编辑","Edit"],"roomLeaderRemove":["移出车头名单","Remove leader"],
  "roomLeaderEmpty":["尚未选择车头，普通成员不会自动加入排程。","No leaders selected. Members are not added to the schedule automatically."],
  "roomLeaderWaiting":["等待本人共享行军时间","Waiting for their march time"],
  "roomLeaderTimes":["集结 {prepare} 秒 · 行军 {march} 秒","Preparation {prepare}s · March {march}s"],
  "roomLeaderBadge":["车头 / Rally leader","Rally leader"],"roomJoinerBadge":["跟车 / Joiner","Joiner"],
  "roomLeaderDuplicate":["该成员已在车头名单中，请编辑已有车头。","This member is already a rally leader. Edit the existing leader."],
  "roomEnemySelect":["敌方队伍","Enemy team"],"roomNewEnemy":["＋ 新增敌方","＋ New enemy"],
  "roomRecord":["记录现在并同步","Record now and share"],"roomRecordHint":["游戏倒计时走到输入读数时点击。下方敌方列表的微调和删除会同步给全房间。","Click when the game countdown reaches your reading. Fine adjustments and deletions in the enemy list below are shared with the room."],
  "roomLimits":["免费配额保护：每人 1 房，全站 3 房，每房 30 人，6 小时过期。共享修改会计入每日额度。","Free-tier limits: 1 room per host, 3 active rooms, 30 members per room, 6-hour expiry. Shared changes count toward the daily limit."],
  "roomSolo":["本机模式","Local mode"],"roomVerified":["已验证 Discord 成员","Discord membership verified"],
  "roomOnlineShort":["已同步","Synced"],"roomOfflineShort":["同步断开","Sync disconnected"],
  "roomVerify":["正在验证 Discord 成员身份…","Checking Discord membership…"],"roomNeedLogin":["登录并验证后才能创建或加入房间。","Sign in and verify membership to create or join rooms."],
  "roomProviderSetup":["Discord 登录尚未配置，请先完成 Supabase 后台设置。","Discord sign-in is not configured yet. Complete the Supabase provider setup first."],
  "roomWebOnly":["房间协作请通过在线网站的浏览器使用。","Use the online website in a browser for room collaboration."],
  "roomNotMember":["仅限指定 Discord 服务器的成员使用。","Only members of the approved Discord server can use rooms."],
  "roomReauth":["Discord 验证已过期，请重新登录授权。","Discord verification expired. Sign in again to authorize."],
  "roomUnavailable":["同步服务暂时无法连接。共享编辑已暂停。","The sync service is unavailable. Shared editing is paused."],
  "roomOffline":["已断线，暂停共享编辑；当前计时仅基于最后收到的记录。","Disconnected. Shared editing is paused; timers use the last received records."],
  "roomConnected":["同步正常 · {role} · 时钟估计误差 ±{ms} 毫秒 · {expiry} 到期","Connected · {role} · Clock estimate ±{ms} ms · Expires {expiry}"],
  "roomClockWarning":["网络延迟较大，请核对实战读数。","High network delay. Check the game readings."],
  "roomOwner":["房主","Host"],"roomCommander":["指挥","Commander"],"roomMember":["队友","Member"],
  "roomClose":["关闭房间","Close room"],"roomLeave":["离开房间","Leave room"],
  "roomCloseConfirm":["关闭后所有队友将停止同步，确定关闭房间？","Close this room? All teammates will stop syncing."],
  "roomConflict":["该记录已被另一位指挥修改，已重新读取，请核对后再操作。","Another commander changed this record. It has been refreshed; check it before editing again."],
  "roomQuota":["已达到房间容量或更新额度，请稍后再试。","Room capacity or update quota reached. Try again later."],
  "roomOwned":["你已有一个有效房间，请先关闭原房间。","You already host an active room. Close it before creating another."],
  "roomGone":["房间已关闭或过期，已恢复本机模式。","Room closed or expired. Local mode restored."],
  "roomPermission":["你没有权限修改此记录。","You do not have permission to change this record."],
  "roomCopied":["房间码已复制","Room code copied"],"roomInvalid":["请检查昵称、房间码和时间读数。","Check the name, room code and time readings."],
  "roomSaved":["已同步","Shared"],"roomRoleHint":["身份组","Room role"],
  "battleTitle": ["战场时间轴", "Battle timeline"],
  "battleHorizon": ["未来 60 秒", "Next 60 seconds"],
  "battleHint": ["出征与到达分开看；窗口已扣除两端容错。", "Departure and arrival use separate tracks. Both end margins are already deducted."],
  "battleAttack": ["敌方到达", "Enemy arrival"],
  "battleDeparture": ["点击出征", "Send troops"],
  "battleArrival": ["援军到达", "Reinforcement arrival"],
  "battleNarrow": ["不足 1 秒", "Under 1 second"],
  "battleBlocked": ["无安全间隙", "No safe gap"],
  "battleNow": ["现在", "Now"],
  "battleEmpty": ["记录敌方倒计时后，这里会显示未来 60 秒的战况。", "Record enemy countdowns to see the next 60 seconds here."],
  "battleDetailHint": ["点击色带查看对应的两波攻击和完整时间范围（UTC）。", "Select a band to see its two attacks and full time range (UTC)."],
  "battleVisible": ["{time} · 未来 60 秒内 {n} 队到达", "{time} · {n} arrivals in the next 60 seconds"],
  "battleLater": ["下一队在 {time} 后到达，进入未来 60 秒时自动显示。", "Next arrival in {time}. It will appear when within 60 seconds."],
  "battleFinished": ["已记录的攻击均已到达，请继续记录新战况。", "All recorded attacks have arrived. Record new attacks to continue."],
  "battleOne": ["再记录一队即可计算补兵窗口。", "Record one more enemy to calculate reinforcement windows."],
  "battleRange": ["{kind} · {before} → {after} · {start} – {end} · 窗口 {width}", "{kind} · {before} → {after} · {start} – {end} · Window {width}"],
  "battleBlockedDetail": ["{before} → {after}：扣除容错后没有安全补兵间隙。", "{before} → {after}: no safe reinforcement gap after margins."],
  "battleAttackDetail": ["{name} · 预计攻击到达 {time}", "{name} · Estimated attack arrival {time}"],
  "installAppName": ["Kingshot 战术计时助手", "Kingshot Timing Assistant"],
  "installShortName": ["战术计时", "Kingshot Timer"],
  "installTitle": ["安装帮助", "Installation help"],
  "installBenefit": ["当前浏览器未提供安装弹窗，可按下面的方法操作。", "An install prompt is not currently available. Try the steps below."],
  "installNow": ["安装应用", "Install app"],
  "installHelp": ["安装帮助", "Installation help"],
  "installClose": ["关闭", "Close"],
  "installDesktop": ["请使用浏览器地址栏中的安装图标，或在浏览器菜单中查找「安装应用」。", "Use the install icon in the browser address bar, or look for Install app in the browser menu."],
  "installIOS": ["在 Safari 中打开此页面，点击「分享」→「添加到主屏幕」→「添加」。如果看到「作为网页 App 打开」，请开启。", "Open this page in Safari. Tap Share → Add to Home Screen → Add. If you see Open as Web App, turn it on."],
  "installAndroid": ["打开浏览器菜单（⋮），选择「安装应用」或「添加到主屏幕」。若没有该选项，可尝试用 Chrome 打开此页面。", "Open the browser menu (⋮) and choose Install app or Add to Home Screen. If neither is available, try opening this page in Chrome."],
  "installEmbedded": ["请先通过右上角菜单选择「在浏览器中打开」。iPhone 使用 Safari，安卓可使用 Chrome，再添加到主屏幕。", "Use the top-right menu to open this page in your browser: Safari on iPhone or Chrome on Android. Then add it to your home screen."],
  "rallyPetTitle": ["车头宠物 · 估计计时", "Leader pet · estimated timer"],
  "rallyPetReminderTitle": ["集结车头宠物可能即将或已经结束", "Rally leader pet effect may be ending or have ended"],
  "rallyPetReminder": ["{names}：请核对游戏中的行军时间，更新后重新生成集结排程。", "{names}: check march times in the game, update them, then regenerate the rally schedule."],
  "petTitle": ["敌方宠物 · 估计计时", "Enemy pet · estimated timer"],
  "petElapsed": ["估计已开启（分钟）", "Estimated minutes already active"],
  "petStart": ["发现已开宠物", "Pet seen active"],
  "petApply": ["应用新的估计", "Apply new estimate"],
  "petStop": ["标记已结束", "Mark as ended"],
  "petHelp": ["持续 2 小时，提前 5 分钟提醒。不知道已开启多久就填 0，此时按发现时刻估算最晚结束时间，实际可能更早。", "Lasts 2 hours; warns 5 minutes before the estimated end. Enter 0 if unsure how long it has been active: this estimates the latest end from when you noticed it. It may end sooner."],
  "petRemaining": ["预计剩余", "Estimated time left"],
  "petActive": ["仅为估计", "Estimate only"],
  "petSoon": ["预计剩余不超过 5 分钟，请更新行军时间", "About 5 minutes or less left. Update march time."],
  "petExpired": ["预计已结束，请核对行军时间", "Estimated to have ended. Check march time."],
  "petUncertain": ["设备时间有变化，请重新估计并核对行军时间", "Device time changed. Re-estimate and check march time."],
  "petEndAt": ["预计结束：{time}", "Estimated end: {time}"],
  "petElapsedInvalid": ["请填写 0 到 120 之间的分钟数。", "Enter a number of minutes between 0 and 120."],
  "petReminderTitle": ["宠物可能即将或已经结束", "Pet effect may be ending or have ended"],
  "petReminder": ["{names}：请核对游戏中的行军时间，更新后重新记录攻击倒计时。", "{names}: check march times in the game, update them, then record the attack countdowns again."],
  "petUpdateMarch": ["去更新行军时间", "Update march time"],
  "petStarted": ["已按估计开启时间计时，提前 5 分钟提醒", "Estimate saved. Reminder set for 5 minutes before the estimated end."],
  "localClock": ["本地 {time}", "Local {time}"],
  "utcNow": ["当前 UTC 时间", "Current UTC time"],
  "utcDevice": ["根据设备时钟换算", "Based on your device clock"],
  "shareTitle": ["UTC 集结时间表", "UTC rally schedule"],
  "copySchedule": ["一键复制时间表", "Copy schedule"],
  "shareEmpty": ["先填写车头名单，点击「生成开车倒计时」，即可在这里一键复制所有车头的 UTC 发起时间。", "Fill in your leaders and click “Generate countdowns” to copy everyone's UTC rally start times here."],
  "shareHint": ["复制当前生效的排程，直接粘贴给队友；以下均为发起集结的时间。", "Copy the active schedule and paste it to your team. Times below are when to start each rally."],
  "shareArrival": ["共同到达", "Arrive together"],
  "shareLaunch": ["发起集结时间（UTC）", "Start each rally (UTC)"],
  "scheduleCopied": ["UTC 时间表已复制，可以粘贴给队友了", "UTC schedule copied. Paste it to your team."],
  "copyFallback": ["自动复制未成功，已选中时间表，请手动复制", "Automatic copy failed. The schedule is selected; copy it manually."],
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
    "独立辅助工具 · v0.2.7",
    "Independent tool · v0.2.7"
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
    "记录后对照实时倒计时，用加减按钮校准当前队伍；需要替换读数时再重新记录。",
    "Compare the live timer with the game and use +/− to adjust this team. Record again only to replace the reading."
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
    "Rallying"
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
    "请先添加或启用至少一位车头",
    "Add or enable at least one leader first."
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
  ],
  "narrowGap": ["补兵窗口不足 1 秒", "Reinforcement window under 1 second"],
  "hospitalWarning": ["可能补兵失败，注意医院容量。", "Reinforcements may fail. Check your hospital capacity."],
  "liveTiming": ["实时校准 · 对照游戏", "Live timing · compare with game"],
  "prepareAdjust": ["微调已记录的集结时间", "Adjust recorded rally time"],
  "marchAdjust": ["微调已记录的行军时间", "Adjust recorded march time"],
  "adjustPrepare": ["集结时间调整 {delta} 秒", "Adjust rally time by {delta} seconds"],
  "adjustMarch": ["行军时间调整 {delta} 秒", "Adjust march time by {delta} seconds"],
  "adjustHelp": ["＋ 延后，− 提前。按钮立即修改本次记录和补兵窗口，无需重新记录；上方输入保留用于下次记录。集结结束后自动开始行军倒计时。", "+ delays, − advances. Buttons immediately update this record and reinforcement windows. Inputs above remain for the next recording. March countdown starts when rallying ends."],
  "adjustApplied": ["已校准 · 预计攻击 {time}", "Adjusted · estimated attack {time}"],
  "prepareEnded": ["集结阶段已结束，请微调行军时间或重新记录。", "Rallying has ended. Adjust march time or record again."],
  "adjustBelowZero": ["调整后集结剩余不能小于 0 秒，请使用更小步长。", "Rally time remaining cannot be negative. Use a smaller step."]
};

  let language = 'zh-CN';
  function choose(preferred) { return /^zh(?:-|$)/i.test(preferred || '') ? 'zh-CN' : 'en'; }
  function translate(key, params = {}, locale = language) {
    const pair = catalogue[key];
    if (!pair) throw new Error('Missing translation: ' + key);
    const template = pair[locale === 'en' ? 1 : 0] || pair[0];
    return template.replace(/\{(\w+)\}/g, (_, name) => String(params[name] ?? '{'+name+'}'));
  }
  function syncInstallMetadata() {
    const manifest = document.querySelector('link[rel="manifest"]');
    const href = language === 'zh-CN' ? 'manifest.webmanifest' : 'manifest.en.webmanifest';
    const changed = manifest && manifest.getAttribute('href') !== href;
    if (changed) manifest.setAttribute('href', href);
    document.querySelector('meta[name="apple-mobile-web-app-title"]')?.setAttribute('content', translate('installShortName'));
    document.documentElement.lang = language;
    document.title = translate('appTitle');
    if (changed) root.dispatchEvent(new Event('kingshot:install-language-change'));
  }
  function apply() {
    document.documentElement.lang = language;
    document.querySelectorAll('[data-i18n]').forEach(el => el.textContent = translate(el.dataset.i18n));
    for (const attr of ['aria-label','content','placeholder']) document.querySelectorAll('[data-i18n-'+attr+']').forEach(el => el.setAttribute(attr, translate(el.getAttribute('data-i18n-'+attr))));
    document.title = translate('appTitle');
  }
  const api = {catalogue, choose, t:translate, apply, get language(){return language;}, setLanguage(value){language=choose(value);if(typeof document!=='undefined')syncInstallMetadata();}, number(value){return new Intl.NumberFormat(language,{maximumFractionDigits:2}).format(value);}};
  if (typeof module !== 'undefined' && module.exports) module.exports=api;
  else {
    root.KingshotI18n=api;
    let preferred=navigator.language;
    try { preferred=localStorage.getItem(`kingshot:${new URL('.',location.href).pathname}:language`) || preferred; } catch {}
    api.setLanguage(preferred);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
