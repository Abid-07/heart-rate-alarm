import { createWidget, widget, align, text_style, deleteWidget, prop } from '@zos/ui'
import { HeartRate, Vibrator } from '@zos/sensor'
import { requestPermission } from '@zos/app'
import {
  setPageBrightTime,
  pauseDropWristScreenOff,
  pausePalmScreenOff,
  resetPageBrightTime,
  resetDropWristScreenOff,
  resetPalmScreenOff
} from '@zos/display'
import * as alarmMgr from '@zos/alarm'

Page({
  state: {
    mode: 'SETTING',

    selectedHour: 7,
    selectedMinute: 0,
    scheduledTime: null,
    alarmId: null,

    hrSensor: null,
    vibrator: null,
    hrCallback: null,

    isStabilizing: true,
    stabilizeStartTime: 0,
    warmupDurationMs: 10000,
    stabilizeDurationMs: 20000,
    baselineSamples: [],
    baselineBpm: null,
    currentBpm: null,
    targetBpm: 72,
    requiredDelta: 15,
    pulseToggle: false,

    tickerTimer: null,
    vibrationTimer: null,

    widgets: [],
    titleWidget: null,
    timeDisplayWidget: null,
    bpmDisplayWidget: null,
    pulseIconWidget: null,
    statusNoticeWidget: null,
    debugWidget: null
  },

  onInit(params) {
    if (params === 'alarm_triggered' || params === 'test_now') {
      this.state.mode = 'ALARM'
    } else {
      const defaultTime = new Date(Date.now() + 5 * 60 * 1000)
      this.state.selectedHour = defaultTime.getHours()
      this.state.selectedMinute = defaultTime.getMinutes()
    }
  },

  build() {
    this.requestPermissions()
    this.initSensors()

    if (this.state.mode === 'ALARM') {
      this.startAlarmMode()
    } else {
      this.renderSettingUI()
    }
  },

  requestPermissions() {
    try {
      if (typeof requestPermission === 'function') {
        requestPermission({
          permissions: ['data:user.hd.heart_rate', 'data:user.hd.step'],
          callback: () => {}
        })
      }
    } catch (e) {}
  },

  initSensors() {
    try {
      if (!this.state.vibrator) {
        this.state.vibrator = new Vibrator()
      }
    } catch (e) {}

    try {
      if (!this.state.hrSensor) {
        this.state.hrSensor = new HeartRate()
      }
    } catch (e) {}
  },

  keepScreenAwake() {
    try {
      if (typeof setPageBrightTime === 'function') {
        setPageBrightTime({ brightTime: 600000 })
      }
      if (typeof pauseDropWristScreenOff === 'function') {
        pauseDropWristScreenOff({ duration: 600000 })
      }
      if (typeof pausePalmScreenOff === 'function') {
        pausePalmScreenOff({ duration: 600000 })
      }
    } catch (e) {}
  },

  restoreScreenBehavior() {
    try {
      if (typeof resetPageBrightTime === 'function') {
        resetPageBrightTime()
      }
      if (typeof resetDropWristScreenOff === 'function') {
        resetDropWristScreenOff()
      }
      if (typeof resetPalmScreenOff === 'function') {
        resetPalmScreenOff()
      }
    } catch (e) {}
  },

  clearWidgets() {
    this.state.widgets.forEach(w => {
      try {
        if (w) deleteWidget(w)
      } catch (e) {}
    })
    this.state.widgets = []
    this.state.titleWidget = null
    this.state.timeDisplayWidget = null
    this.state.bpmDisplayWidget = null
    this.state.pulseIconWidget = null
    this.state.statusNoticeWidget = null
    this.state.debugWidget = null
  },

  renderSettingUI() {
    this.restoreScreenBehavior()
    this.clearWidgets()
    this.state.mode = 'SETTING'

    const title = createWidget(widget.TEXT, {
      x: 0,
      y: 45,
      w: 390,
      h: 30,
      color: 0xffffff,
      text_size: 22,
      align_h: align.CENTER_H,
      text: 'Heart Rate Alarm'
    })

    this.state.timeDisplayWidget = createWidget(widget.TEXT, {
      x: 0,
      y: 80,
      w: 390,
      h: 48,
      color: 0x00e5ff,
      text_size: 40,
      align_h: align.CENTER_H,
      align_v: align.CENTER_V,
      text: this.getFormattedSelectedTime()
    })

    const btnHourMinus = createWidget(widget.BUTTON, {
      x: 35,
      y: 135,
      w: 150,
      h: 38,
      radius: 10,
      normal_color: 0x222222,
      press_color: 0x444444,
      text: '- 1 Hr',
      text_size: 16,
      click_func: () => {
        this.state.selectedHour = (this.state.selectedHour + 23) % 24
        this.updateTimeDisplay()
      }
    })

    const btnHourPlus = createWidget(widget.BUTTON, {
      x: 205,
      y: 135,
      w: 150,
      h: 38,
      radius: 10,
      normal_color: 0x222222,
      press_color: 0x444444,
      text: '+ 1 Hr',
      text_size: 16,
      click_func: () => {
        this.state.selectedHour = (this.state.selectedHour + 1) % 24
        this.updateTimeDisplay()
      }
    })

    const btnMin5Minus = createWidget(widget.BUTTON, {
      x: 35,
      y: 178,
      w: 150,
      h: 38,
      radius: 10,
      normal_color: 0x222222,
      press_color: 0x444444,
      text: '- 5 Min',
      text_size: 16,
      click_func: () => {
        this.state.selectedMinute = (this.state.selectedMinute + 55) % 60
        this.updateTimeDisplay()
      }
    })

    const btnMin5Plus = createWidget(widget.BUTTON, {
      x: 205,
      y: 178,
      w: 150,
      h: 38,
      radius: 10,
      normal_color: 0x222222,
      press_color: 0x444444,
      text: '+ 5 Min',
      text_size: 16,
      click_func: () => {
        this.state.selectedMinute = (this.state.selectedMinute + 5) % 60
        this.updateTimeDisplay()
      }
    })

    const btnMin1Minus = createWidget(widget.BUTTON, {
      x: 35,
      y: 221,
      w: 150,
      h: 38,
      radius: 10,
      normal_color: 0x222222,
      press_color: 0x444444,
      text: '- 1 Min',
      text_size: 16,
      click_func: () => {
        this.state.selectedMinute = (this.state.selectedMinute + 59) % 60
        this.updateTimeDisplay()
      }
    })

    const btnMin1Plus = createWidget(widget.BUTTON, {
      x: 205,
      y: 221,
      w: 150,
      h: 38,
      radius: 10,
      normal_color: 0x222222,
      press_color: 0x444444,
      text: '+ 1 Min',
      text_size: 16,
      click_func: () => {
        this.state.selectedMinute = (this.state.selectedMinute + 1) % 60
        this.updateTimeDisplay()
      }
    })

    const btnSetAlarm = createWidget(widget.BUTTON, {
      x: 35,
      y: 265,
      w: 320,
      h: 48,
      radius: 16,
      normal_color: 0x00c853,
      press_color: 0x00e676,
      text: 'SET ALARM',
      text_size: 20,
      click_func: () => {
        this.scheduleAlarm()
      }
    })

    const btnTestNow = createWidget(widget.BUTTON, {
      x: 35,
      y: 318,
      w: 320,
      h: 42,
      radius: 14,
      normal_color: 0xd50000,
      press_color: 0xff1744,
      text: 'TEST ALARM NOW',
      text_size: 17,
      click_func: () => {
        this.startAlarmMode()
      }
    })

    const infoNotice = createWidget(widget.TEXT, {
      x: 20,
      y: 365,
      w: 350,
      h: 55,
      color: 0x888888,
      text_size: 13,
      align_h: align.CENTER_H,
      align_v: align.CENTER_V,
      text_style: text_style.WRAP,
      text: 'Requires +15 BPM active HR to disarm.\nZero overnight battery drain.'
    })

    this.state.widgets = [
      title,
      this.state.timeDisplayWidget,
      btnHourMinus,
      btnHourPlus,
      btnMin5Minus,
      btnMin5Plus,
      btnMin1Minus,
      btnMin1Plus,
      btnSetAlarm,
      btnTestNow,
      infoNotice
    ]
  },

  getFormattedSelectedTime() {
    const hh = String(this.state.selectedHour).padStart(2, '0')
    const mm = String(this.state.selectedMinute).padStart(2, '0')
    return `${hh}:${mm}`
  },

  updateTimeDisplay() {
    if (this.state.timeDisplayWidget) {
      this.state.timeDisplayWidget.setProperty(prop.TEXT, this.getFormattedSelectedTime())
    }
  },

  calculateTargetDate() {
    const now = new Date()
    const target = new Date(now)
    target.setHours(this.state.selectedHour, this.state.selectedMinute, 0, 0)

    if (target.getTime() <= now.getTime()) {
      target.setDate(target.getDate() + 1)
    }
    return target
  },

  scheduleAlarm() {
    const targetDate = this.calculateTargetDate()
    const timeSec = Math.floor(targetDate.getTime() / 1000)

    try {
      if (alarmMgr && alarmMgr.set) {
        this.state.alarmId = alarmMgr.set({
          appid: 20001,
          url: 'page/index',
          time: timeSec,
          param: 'alarm_triggered',
          store: true,
          repeat_type: alarmMgr.REPEAT_ONCE || 0
        })
      }
    } catch (e) {}

    this.state.scheduledTime = targetDate
    this.clearWidgets()

    const title = createWidget(widget.TEXT, {
      x: 0,
      y: 80,
      w: 390,
      h: 40,
      color: 0x00e5ff,
      text_size: 28,
      align_h: align.CENTER_H,
      text: 'Alarm Scheduled'
    })

    const timeStr = this.getFormattedSelectedTime()
    const isTomorrow = targetDate.getDate() !== (new Date()).getDate()
    const dayText = isTomorrow ? 'Tomorrow' : 'Today'

    const info = createWidget(widget.TEXT, {
      x: 20,
      y: 140,
      w: 350,
      h: 110,
      color: 0xffffff,
      text_size: 20,
      align_h: align.CENTER_H,
      align_v: align.CENTER_V,
      text_style: text_style.WRAP,
      text: `Set for ${dayText} at ${timeStr}.\n\nYou can exit the app.\nThe watch will wake you up!`
    })

    const btnCancel = createWidget(widget.BUTTON, {
      x: 65,
      y: 280,
      w: 260,
      h: 55,
      radius: 16,
      normal_color: 0x444444,
      press_color: 0x666666,
      text: 'Cancel / Edit',
      text_size: 20,
      click_func: () => {
        if (this.state.alarmId && alarmMgr && alarmMgr.cancel) {
          try {
            alarmMgr.cancel(this.state.alarmId)
          } catch (e) {}
        }
        this.state.scheduledTime = null
        this.renderSettingUI()
      }
    })

    this.state.widgets = [title, info, btnCancel]
  },

  triggerVibration() {
    if (this.state.mode === 'ALARM' && !this.state.isStabilizing && this.state.vibrator) {
      try {
        if (typeof this.state.vibrator.setMode === 'function') {
          this.state.vibrator.setMode(2)
        }
        this.state.vibrator.start()
      } catch (e) {}
    }
  },

  startAlarmMode() {
    this.keepScreenAwake()
    this.clearWidgets()
    this.state.mode = 'ALARM'

    this.state.isStabilizing = true
    this.state.stabilizeStartTime = Date.now()
    this.state.baselineSamples = []
    this.state.baselineBpm = null
    this.state.currentBpm = null
    this.state.targetBpm = 72

    this.state.titleWidget = createWidget(widget.TEXT, {
      x: 0,
      y: 50,
      w: 390,
      h: 36,
      color: 0xff1744,
      text_size: 28,
      align_h: align.CENTER_H,
      text: 'WAKE UP!'
    })

    this.state.pulseIconWidget = createWidget(widget.TEXT, {
      x: 0,
      y: 90,
      w: 390,
      h: 28,
      color: 0xff1744,
      text_size: 20,
      align_h: align.CENTER_H,
      text: '♥ CALIBRATING (20s) ♥'
    })

    this.state.bpmDisplayWidget = createWidget(widget.TEXT, {
      x: 0,
      y: 122,
      w: 390,
      h: 70,
      color: 0xff1744,
      text_size: 48,
      align_h: align.CENTER_H,
      align_v: align.CENTER_V,
      text: '-- BPM'
    })

    this.state.statusNoticeWidget = createWidget(widget.TEXT, {
      x: 20,
      y: 195,
      w: 350,
      h: 55,
      color: 0xffffff,
      text_size: 18,
      align_h: align.CENTER_H,
      align_v: align.CENTER_V,
      text_style: text_style.WRAP,
      text: 'Sensor warming up...\nFiltering initial PPG noise...'
    })

    this.state.debugWidget = createWidget(widget.TEXT, {
      x: 10,
      y: 260,
      w: 370,
      h: 40,
      color: 0xaaaaaa,
      text_size: 15,
      align_h: align.CENTER_H,
      align_v: align.CENTER_V,
      text_style: text_style.WRAP,
      text: 'Discarding first 10s sensor noise...'
    })

    const btnSimulateBpm = createWidget(widget.BUTTON, {
      x: 95,
      y: 320,
      w: 200,
      h: 45,
      radius: 12,
      normal_color: 0x333333,
      press_color: 0x555555,
      text: '+5 BPM (Test)',
      text_size: 18,
      click_func: () => {
        this.simulateBpmIncrease()
      }
    })

    this.state.widgets = [
      this.state.titleWidget,
      this.state.pulseIconWidget,
      this.state.bpmDisplayWidget,
      this.state.statusNoticeWidget,
      this.state.debugWidget,
      btnSimulateBpm
    ]

    if (this.state.vibrationTimer) clearInterval(this.state.vibrationTimer)
    this.state.vibrationTimer = setInterval(() => {
      this.triggerVibration()
    }, 1200)

    this.initSensors()
    if (this.state.hrSensor) {
      this.state.hrCallback = () => {
        this.updateHRReading()
      }
      try {
        if (typeof this.state.hrSensor.onCurrentChange === 'function') {
          this.state.hrSensor.onCurrentChange(this.state.hrCallback)
        }
      } catch (e) {}
    }

    if (this.state.tickerTimer) clearInterval(this.state.tickerTimer)
    this.state.tickerTimer = setInterval(() => {
      this.state.pulseToggle = !this.state.pulseToggle
      this.updateHRReading()
    }, 500)
  },

  updateHRReading() {
    if (this.state.mode !== 'ALARM') return

    let rawBpm = null
    if (this.state.hrSensor) {
      try {
        rawBpm = this.state.hrSensor.getCurrent()
      } catch (e) {}
    }

    if (typeof rawBpm === 'number' && !isNaN(rawBpm) && rawBpm >= 40 && rawBpm <= 220) {
      this.state.currentBpm = rawBpm

      if (this.state.isStabilizing) {
        const elapsedMs = Date.now() - this.state.stabilizeStartTime

        if (elapsedMs >= this.state.warmupDurationMs) {
          this.state.baselineSamples.push(rawBpm)
        }

        if (elapsedMs >= this.state.stabilizeDurationMs) {
          let avg = rawBpm
          if (this.state.baselineSamples.length > 0) {
            const sum = this.state.baselineSamples.reduce((a, b) => a + b, 0)
            avg = Math.round(sum / this.state.baselineSamples.length)
          }

          this.state.baselineBpm = avg
          this.state.targetBpm = avg + this.state.requiredDelta
          this.state.isStabilizing = false

          this.triggerVibration()
        }
      }
    }

    this.refreshAlarmUI()

    if (!this.state.isStabilizing && this.state.currentBpm !== null && this.state.currentBpm >= this.state.targetBpm) {
      this.disarmAlarm()
    }
  },

  simulateBpmIncrease() {
    if (this.state.mode !== 'ALARM') return

    if (this.state.isStabilizing) {
      this.state.baselineBpm = 57
      this.state.targetBpm = 57 + this.state.requiredDelta
      this.state.currentBpm = 57
      this.state.isStabilizing = false
      this.triggerVibration()
    }

    this.state.currentBpm += 5
    this.state.pulseToggle = !this.state.pulseToggle
    this.refreshAlarmUI()

    if (!this.state.isStabilizing && this.state.currentBpm >= this.state.targetBpm) {
      this.disarmAlarm()
    }
  },

  refreshAlarmUI() {
    if (this.state.mode !== 'ALARM') return

    const currentText = (this.state.currentBpm !== null) ? `${this.state.currentBpm} BPM` : 'Measuring...'

    if (this.state.isStabilizing) {
      const elapsedSec = Math.min(20, Math.floor((Date.now() - this.state.stabilizeStartTime) / 1000))
      const remainSec = Math.max(1, 20 - elapsedSec)

      if (this.state.pulseIconWidget) {
        const heartIcon = this.state.pulseToggle ? '♥ CALIBRATING ♥' : '♡ CALIBRATING ♡'
        this.state.pulseIconWidget.setProperty(prop.TEXT, heartIcon)
      }

      if (this.state.bpmDisplayWidget) {
        this.state.bpmDisplayWidget.setProperty(prop.TEXT, currentText)
      }

      if (this.state.statusNoticeWidget) {
        if (elapsedSec < 10) {
          const warmupRemain = 10 - elapsedSec
          this.state.statusNoticeWidget.setProperty(prop.TEXT, `Warming up sensor (${warmupRemain}s)...\nIgnoring initial PPG noise...`)
        } else {
          this.state.statusNoticeWidget.setProperty(prop.TEXT, `Sampling stable baseline (${remainSec}s)...\nStay still briefly...`)
        }
      }

      if (this.state.debugWidget) {
        if (elapsedSec < 10) {
          this.state.debugWidget.setProperty(prop.TEXT, `Phase 1/2: Warmup (Discarding noise)`)
        } else {
          const samplesCount = this.state.baselineSamples.length
          this.state.debugWidget.setProperty(prop.TEXT, `Phase 2/2: Stable Samples (${samplesCount})`)
        }
      }
      return
    }

    const baseText = `${this.state.baselineBpm} BPM`

    if (this.state.pulseIconWidget) {
      const heartIcon = this.state.pulseToggle ? '♥  GOAL ACTIVE  ♥' : '♡  GOAL ACTIVE  ♡'
      this.state.pulseIconWidget.setProperty(prop.TEXT, heartIcon)
    }

    if (this.state.bpmDisplayWidget) {
      this.state.bpmDisplayWidget.setProperty(prop.TEXT, currentText)
    }

    if (this.state.statusNoticeWidget) {
      if (this.state.currentBpm !== null && this.state.baselineBpm !== null) {
        const diff = Math.max(0, this.state.currentBpm - this.state.baselineBpm)
        const needed = Math.max(0, this.state.targetBpm - this.state.currentBpm)
        this.state.statusNoticeWidget.setProperty(prop.TEXT, `Elevated: +${diff} BPM\nNeed +${needed} BPM more to disarm`)
      } else {
        this.state.statusNoticeWidget.setProperty(prop.TEXT, 'Get up & active to raise heart rate!')
      }
    }

    if (this.state.debugWidget) {
      this.state.debugWidget.setProperty(prop.TEXT, `Stable Base: ${baseText} | Target: ${this.state.targetBpm} BPM`)
    }
  },

  disarmAlarm() {
    if (this.state.mode === 'DONE') return
    this.state.mode = 'DONE'

    if (this.state.vibrationTimer) {
      clearInterval(this.state.vibrationTimer)
      this.state.vibrationTimer = null
    }
    if (this.state.tickerTimer) {
      clearInterval(this.state.tickerTimer)
      this.state.tickerTimer = null
    }

    this.restoreScreenBehavior()
    this.renderDoneUI()

    setTimeout(() => {
      try {
        if (this.state.vibrator) {
          this.state.vibrator.stop()
        }
      } catch (e) {}

      try {
        if (this.state.hrSensor && this.state.hrCallback && typeof this.state.hrSensor.offCurrentChange === 'function') {
          this.state.hrSensor.offCurrentChange(this.state.hrCallback)
        }
      } catch (e) {}
    }, 200)
  },

  renderDoneUI() {
    this.clearWidgets()

    const title = createWidget(widget.TEXT, {
      x: 0,
      y: 50,
      w: 390,
      h: 40,
      color: 0x00e676,
      text_size: 32,
      align_h: align.CENTER_H,
      text: 'GOOD MORNING!'
    })

    const finalBpm = (this.state.currentBpm !== null) ? this.state.currentBpm : this.state.targetBpm
    const baseVal = (this.state.baselineBpm !== null) ? this.state.baselineBpm : 57
    const diff = Math.max(0, finalBpm - baseVal)

    const bpmText = createWidget(widget.TEXT, {
      x: 0,
      y: 105,
      w: 390,
      h: 70,
      color: 0x00e676,
      text_size: 46,
      align_h: align.CENTER_H,
      align_v: align.CENTER_V,
      text: `${finalBpm} BPM`
    })

    const notice = createWidget(widget.TEXT, {
      x: 20,
      y: 185,
      w: 350,
      h: 90,
      color: 0xffffff,
      text_size: 20,
      align_h: align.CENTER_H,
      align_v: align.CENTER_V,
      text_style: text_style.WRAP,
      text: `Elevated by +${diff} BPM!\nYou are active, awake, and alert.`
    })

    const btnBack = createWidget(widget.BUTTON, {
      x: 65,
      y: 310,
      w: 260,
      h: 55,
      radius: 16,
      normal_color: 0x00c853,
      press_color: 0x00e676,
      text: 'Back to Settings',
      text_size: 20,
      click_func: () => {
        this.renderSettingUI()
      }
    })

    this.state.widgets = [title, bpmText, notice, btnBack]
  },

  onDestroy() {
    if (this.state.vibrationTimer) clearInterval(this.state.vibrationTimer)
    if (this.state.tickerTimer) clearInterval(this.state.tickerTimer)
    this.restoreScreenBehavior()

    try {
      if (this.state.vibrator) {
        this.state.vibrator.stop()
      }
    } catch (e) {}
    try {
      if (this.state.hrSensor && this.state.hrCallback && typeof this.state.hrSensor.offCurrentChange === 'function') {
        this.state.hrSensor.offCurrentChange(this.state.hrCallback)
      }
    } catch (e) {}
  }
})
