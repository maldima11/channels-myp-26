package com.nustyieldmobile

import android.content.Context
import android.media.AudioAttributes
import android.media.MediaPlayer
import android.net.Uri
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.modules.core.DeviceEventManagerModule

class AudioPlayerModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    private var mediaPlayer: MediaPlayer? = null
    private var currentSource: String? = null

    override fun getName(): String {
        return "AudioPlayerModule"
    }

    private fun sendEvent(eventName: String, params: Any?) {
        if (reactContext.hasActiveReactInstance()) {
            reactContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                .emit(eventName, params)
        }
    }

    @ReactMethod
    fun play(source: String, promise: Promise) {
        try {
            stopCurrent()

            val cleanSource = source.trim()
            currentSource = cleanSource

            if (cleanSource.startsWith("http://") || cleanSource.startsWith("https://")) {
                mediaPlayer = MediaPlayer().apply {
                    setAudioAttributes(
                        AudioAttributes.Builder()
                            .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                            .setUsage(AudioAttributes.USAGE_MEDIA)
                            .build()
                    )
                    setDataSource(cleanSource)
                    setOnPreparedListener { mp ->
                        mp.start()
                        sendEvent("onAudioPlaybackStarted", cleanSource)
                        promise.resolve(true)
                    }
                    setOnCompletionListener {
                        sendEvent("onAudioPlaybackEnded", cleanSource)
                        stopCurrent()
                    }
                    setOnErrorListener { _, what, extra ->
                        sendEvent("onAudioPlaybackError", "Error: $what, $extra")
                        stopCurrent()
                        true
                    }
                    prepareAsync()
                }
            } else {
                // Local res/raw resource
                val resourceName = cleanSource.lowercase().replace(".mp3", "")
                val resId = reactContext.resources.getIdentifier(
                    resourceName,
                    "raw",
                    reactContext.packageName
                )

                if (resId != 0) {
                    mediaPlayer = MediaPlayer.create(reactContext, resId).apply {
                        setOnCompletionListener {
                            sendEvent("onAudioPlaybackEnded", cleanSource)
                            stopCurrent()
                        }
                        start()
                    }
                    sendEvent("onAudioPlaybackStarted", cleanSource)
                    promise.resolve(true)
                } else {
                    promise.reject("RESOURCE_NOT_FOUND", "Audio resource '$resourceName' not found in res/raw")
                }
            }
        } catch (e: Exception) {
            promise.reject("PLAYBACK_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun stop(promise: Promise) {
        try {
            stopCurrent()
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("STOP_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun pause(promise: Promise) {
        try {
            mediaPlayer?.let {
                if (it.isPlaying) {
                    it.pause()
                    sendEvent("onAudioPlaybackPaused", currentSource)
                    promise.resolve(true)
                    return
                }
            }
            promise.resolve(false)
        } catch (e: Exception) {
            promise.reject("PAUSE_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun isPlaying(promise: Promise) {
        promise.resolve(mediaPlayer?.isPlaying == true)
    }

    private fun stopCurrent() {
        try {
            mediaPlayer?.let {
                if (it.isPlaying) {
                    it.stop()
                }
                it.reset()
                it.release()
            }
        } catch (ignored: Exception) {
        } finally {
            mediaPlayer = null
        }
    }

    @ReactMethod
    fun addListener(eventName: String) {
        // Required for React Native built-in Event Emitter
    }

    @ReactMethod
    fun removeListeners(count: Int) {
        // Required for React Native built-in Event Emitter
    }
}
