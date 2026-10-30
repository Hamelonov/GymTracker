package expo.modules.restalert

import android.app.ActivityManager
import android.content.Context
import android.media.AudioAttributes
import android.media.RingtoneManager
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.os.PowerManager
import android.os.VibrationAttributes
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * Сигнал окончания отдыха: вибрация с силой из настроек приложения и звук.
 * Сигнал планируется нативно, потому что JS-таймеры на Android встают, когда приложение в фоне.
 */
class RestAlertModule : Module() {
  private val handler = Handler(Looper.getMainLooper())
  private var pendingAlert: Runnable? = null
  private var wakeLock: PowerManager.WakeLock? = null

  private val context: Context
    get() = requireNotNull(appContext.reactContext) { "React context is not available" }

  override fun definition() = ModuleDefinition {
    Name("RestAlert")

    Function("vibrate") { timings: List<Double>, amplitudes: List<Int> ->
      vibrate(timings, amplitudes)
    }

    Function("playSound") {
      playSound()
    }

    Function("schedule") { delayMs: Double, timings: List<Double>, amplitudes: List<Int>, playSoundInForeground: Boolean ->
      cancel()
      val alert = Runnable {
        pendingAlert = null
        // В фоне звук даёт уведомление; свой звук нужен, только когда приложение открыто.
        if (playSoundInForeground && isAppInForeground()) playSound()
        vibrate(timings, amplitudes)
        releaseWakeLock()
      }
      pendingAlert = alert
      acquireWakeLock(delayMs.toLong() + WAKE_LOCK_MARGIN_MS)
      handler.postDelayed(alert, delayMs.toLong())
    }

    Function("cancel") {
      cancel()
    }

    OnDestroy {
      cancel()
    }
  }

  private fun cancel() {
    pendingAlert?.let { handler.removeCallbacks(it) }
    pendingAlert = null
    releaseWakeLock()
  }

  private fun isAppInForeground(): Boolean {
    val processInfo = ActivityManager.RunningAppProcessInfo()
    ActivityManager.getMyMemoryState(processInfo)
    return processInfo.importance == ActivityManager.RunningAppProcessInfo.IMPORTANCE_FOREGROUND
  }

  private fun vibrator(): Vibrator =
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
      (context.getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as VibratorManager).defaultVibrator
    } else {
      @Suppress("DEPRECATION")
      context.getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
    }

  private fun vibrate(timings: List<Double>, amplitudes: List<Int>) {
    if (timings.isEmpty()) return
    val vibrator = vibrator()
    if (!vibrator.hasVibrator()) return
    val timingArray = timings.map { it.toLong() }.toLongArray()
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
      @Suppress("DEPRECATION")
      vibrator.vibrate(timingArray, -1)
      return
    }
    // Без управления амплитудой сила задаётся только длиной импульсов.
    val effect = if (vibrator.hasAmplitudeControl()) {
      VibrationEffect.createWaveform(timingArray, amplitudes.toIntArray(), -1)
    } else {
      VibrationEffect.createWaveform(timingArray, -1)
    }
    // Категория «будильник»: её сила настраивается отдельно от виброотклика и уведомлений.
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      vibrator.vibrate(effect, VibrationAttributes.createForUsage(VibrationAttributes.USAGE_ALARM))
    } else {
      @Suppress("DEPRECATION")
      vibrator.vibrate(
        effect,
        AudioAttributes.Builder()
          .setUsage(AudioAttributes.USAGE_ALARM)
          .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
          .build()
      )
    }
  }

  private fun playSound() {
    val soundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION) ?: return
    val ringtone = RingtoneManager.getRingtone(context, soundUri) ?: return
    // Звук уведомлений: в беззвучном режиме телефон его сам заглушит.
    ringtone.audioAttributes = AudioAttributes.Builder()
      .setUsage(AudioAttributes.USAGE_NOTIFICATION_EVENT)
      .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
      .build()
    ringtone.play()
  }

  private fun acquireWakeLock(timeoutMs: Long) {
    releaseWakeLock()
    val powerManager = context.getSystemService(Context.POWER_SERVICE) as PowerManager
    wakeLock = powerManager.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "GymTracker:restTimer").apply {
      setReferenceCounted(false)
      acquire(timeoutMs)
    }
  }

  private fun releaseWakeLock() {
    wakeLock?.let { if (it.isHeld) it.release() }
    wakeLock = null
  }

  private companion object {
    const val WAKE_LOCK_MARGIN_MS = 10_000L
  }
}
