import { LogEntry, BorderNode, ConnectionParams } from "./types";

export const INITIAL_LOGS: LogEntry[] = [
  {
    id: "log-1",
    timestamp: "19:07:34.360",
    type: "error",
    core: "VPN",
    message: `JNI startup failed: config error: infra/conf/serial: failed to parse json config > infra/conf: failed to build outbound config with tag proxy > infra/conf: failed to build stream settings for outbound detour > infra/conf: Failed to build TLS config. > common/errors: The feature "allowInsecure" has been removed and migrated to "pinnedPeerCertSha256". Please update your config(s) according to release note and .documentation`
  },
  {
    id: "log-2",
    timestamp: "19:07:26.824",
    type: "error",
    core: "VPN",
    message: `JNI startup failed: config error: infra/conf/serial: failed to parse json config > infra/conf: failed to build outbound config with tag proxy > infra/conf: failed to build stream settings for outbound detour > infra/conf: Failed to build TLS config. > common/errors: The feature "allowInsecure" has been removed and migrated to "pinnedPeerCertSha256". Please update your config(s) according to release note and .documentation`
  },
  {
    id: "log-3",
    timestamp: "19:06:12.110",
    type: "warning",
    core: "CORE",
    message: "WARN: Keep-alive packet delayed > 2000ms"
  },
  {
    id: "log-4",
    timestamp: "19:05:45.302",
    type: "info",
    core: "DNS",
    message: "INFO: Resolving DNS leak protection rules..."
  },
  {
    id: "log-5",
    timestamp: "19:04:12.001",
    type: "success",
    core: "TUN",
    message: "INFO: TUN interface eth0 configured successfully"
  },
  {
    id: "log-6",
    timestamp: "19:03:55.150",
    type: "info",
    core: "VPN",
    message: "INFO: Renegotiating session keys with Germany-Frankfurt gateway..."
  }
];

export const INITIAL_NODES: BorderNode[] = [
  {
    id: "node-de",
    name: "آلمان (Frankfurt)",
    country: "DE",
    ip: "zeus-panel-4iy71t.de.node.network",
    port: 8080,
    protocol: "VLESS + TLS",
    latency: 142,
    stability: 34,
    packetLoss: 4.2,
    jitter: 28,
    status: "unstable"
  },
  {
    id: "node-nl",
    name: "هلند (Amsterdam)",
    country: "NL",
    ip: "zeus-panel-4iy71t.nl.node.network",
    port: 443,
    protocol: "VLESS + Reality",
    latency: 85,
    stability: 89,
    packetLoss: 0.5,
    jitter: 12,
    status: "active"
  },
  {
    id: "node-ae",
    name: "امارات (Dubai)",
    country: "AE",
    ip: "zeus-panel-4iy71t.ae.node.network",
    port: 8443,
    protocol: "VMess + WS",
    latency: 310,
    stability: 12,
    packetLoss: 18.4,
    jitter: 64,
    status: "unstable"
  }
];

export const INITIAL_PARAMS: ConnectionParams = {
  protocol: "Xray / VLESS + TLS",
  encryption: "ChaCha20-Poly1305",
  activePort: 8080,
  mtuSize: 1420,
  keepAlive: "25s",
  dnsAddress: "1.1.1.1, 8.8.8.8"
};

export const SAMPLE_V2RAY_CONFIG = `{
  "outbounds": [
    {
      "protocol": "vless",
      "settings": {
        "vnext": [
          {
            "address": "zeus-panel-4iy71t.kayamavy80.website",
            "port": 8080,
            "users": [
              {
                "id": "e3c15bf1-d572-4663-87bb-990ffb0cf044",
                "encryption": "none",
                "flow": "xtls-rprx-vision"
              }
            ]
          }
        ]
      },
      "streamSettings": {
        "network": "tcp",
        "security": "tls",
        "tlsSettings": {
          "serverName": "zeus-panel-4iy71t.kayamavy80.website",
          "allowInsecure": true,
          "fingerprint": "chrome"
        }
      },
      "tag": "proxy"
    }
  ]
}`;

export const KOTLIN_GENERATOR_SAMPLE = `package com.example.service

import com.example.data.ServerEntity

object XrayConfigGenerator {

    fun generate(server: ServerEntity, fd: Int = -1): String {
        val outbounds = when (server.type.uppercase()) {
            "VLESS" -> generateVlessOutbound(server)
            "VMESS" -> generateVmessOutbound(server)
            "TROJAN" -> generateTrojanOutbound(server)
            "SHADOWSOCKS" -> generateShadowsocksOutbound(server)
            else -> generateFreedomOutbound()
        }

        // طبق مستندات رسمی xray-core (proxy/tun/README.md):
        // - این inbound روی هیچ پورتی listen نمیکنه (port باید 0 باشه)
        // - فقط "name" و "MTU" لازمه
        // - fd از طریق env var "xray.tun.fd" که خودِ StartLoop ست میکنه به xray میرسه
        //   (نیازی به فرستادن fd داخل JSON نیست)
        val tunInboundOpt = if (fd != -1) {
            """,
            {
              "port": 0,
              "protocol": "tun",
              "settings": {
                "name": "xray0",
                "MTU": 1500,
                "sniffing": {
                  "enabled": true,
                  "destOverride": ["http", "tls", "quic"]
                }
              }
            }"""
        } else {
            ""
        }

        return """
        {
          "log": {
            "loglevel": "info"
          },
          "inbounds": [
            {
              "port": 10808,
              "listen": "127.0.0.1",
              "protocol": "socks",
              "settings": {
                "auth": "noauth",
                "udp": true
              }
            },
            {
              "port": 10809,
              "listen": "127.0.0.1",
              "protocol": "http",
              "settings": {}
            }
            $tunInboundOpt
          ],
          "outbounds": [
            $outbounds,
            {
              "protocol": "freedom",
              "settings": {},
              "tag": "direct"
            }
          ]
        }
        """.trimIndent()
    }

    private fun generateVlessOutbound(server: ServerEntity): String {
        val streamSettingsJson = generateStreamSettings(server)
        val flowValue = server.flow.ifEmpty {
            if (server.security.lowercase() == "reality") "xtls-rprx-vision" else ""
        }
        return """
        {
          "protocol": "vless",
          "settings": {
            "vnext": [
              {
                "address": "\${server.address}",
                "port": \${server.port},
                "users": [
                  {
                    "id": "\${server.uuid}",
                    "encryption": "none",
                    "flow": "$flowValue",
                    "level": 0
                  }
                ]
              }
            ]
          },
          "streamSettings": $streamSettingsJson,
          "tag": "proxy"
        }
        """
    }

    private fun generateVmessOutbound(server: ServerEntity): String {
        val streamSettingsJson = generateStreamSettings(server)
        return """
        {
          "protocol": "vmess",
          "settings": {
            "vnext": [
              {
                "address": "\${server.address}",
                "port": \${server.port},
                "users": [
                  {
                    "id": "\${server.uuid}",
                    "alterId": \${server.alterId},
                    "security": "\${server.security.ifEmpty { "auto" }}",
                    "level": 0
                  }
                ]
              }
            ]
          },
          "streamSettings": $streamSettingsJson,
          "tag": "proxy"
        }
        """
    }

    private fun generateTrojanOutbound(server: ServerEntity): String {
        val streamSettingsJson = generateStreamSettings(server)
        return """
        {
          "protocol": "trojan",
          "settings": {
            "servers": [
              {
                "address": "\${server.address}",
                "port": \${server.port},
                "password": "\${server.uuid}",
                "level": 0
              }
            ]
          },
          "streamSettings": $streamSettingsJson,
          "tag": "proxy"
        }
        """
    }

    private fun generateShadowsocksOutbound(server: ServerEntity): String {
        val creds = server.uuid.split(":")
        val method = if (creds.size > 0) creds[0] else "aes-256-gcm"
        val password = if (creds.size > 1) creds[1] else "mypassword"
        val streamSettingsJson = generateStreamSettings(server)

        return """
        {
          "protocol": "shadowsocks",
          "settings": {
            "servers": [
              {
                "address": "\${server.address}",
                "port": \${server.port},
                "method": "$method",
                "password": "$password",
                "level": 0
              }
            ]
          },
          "streamSettings": $streamSettingsJson,
          "tag": "proxy"
        }
        """
    }

    private fun generateFreedomOutbound(): String {
        return """
        {
          "protocol": "freedom",
          "settings": {},
          "tag": "proxy"
        }
        """
    }

    private fun generateStreamSettings(server: ServerEntity): String {
        // تشخیص REALITY: فیلد security برابر "reality" باشه
        val isReality = server.security.lowercase() == "reality"

        val securityStr = when {
            isReality -> "reality"
            server.tls  -> "tls"
            else        -> "none"
        }

        val securityConfig = when {
            isReality -> {
                // فیلدهای واقعی REALITY که الان از پارسر میآن:
                //   server.sni          → serverName هدف (مثلاً "www.google.com")
                //   server.publicKey    → publicKey سرور (پارامتر pbk)
                //   server.shortId      → shortId (پارامتر sid)
                //   server.fingerprint  → fingerprint مرورگر (پارامتر fp)
                val sniToUse      = server.sni.ifEmpty { "www.google.com" }
                val publicKey     = server.publicKey
                val shortId       = server.shortId
                val fingerprint   = server.fingerprint.ifEmpty { "chrome" }
                """
            "realitySettings": {
              "show": false,
              "fingerprint": "$fingerprint",
              "serverName": "$sniToUse",
              "publicKey": "$publicKey",
              "shortId": "$shortId",
              "spiderX": "/"
            }
                """
            }
            server.tls -> {
                val sniToUse = server.sni.ifEmpty { server.address }
                """
            "tlsSettings": {
              "serverName": "$sniToUse",
              "allowInsecure": true
            }
                """
            }
            else -> ""
        }

        val transportConfig = when (server.network.lowercase()) {
            "ws" -> """
            "wsSettings": {
              "path": "\${server.path.ifEmpty { "/" }}",
              "headers": {
                "Host": "\${server.host.ifEmpty { server.address }}"
              }
            }
            """
            "grpc" -> """
            "grpcSettings": {
              "serviceName": "\${server.path.ifEmpty { "v2ray-grpc" }}"
            }
            """
            else -> ""
        }

        val separator = if (securityConfig.isNotEmpty() && transportConfig.isNotEmpty()) "," else ""

        return """
        {
          "network": "\${server.network.lowercase().ifEmpty { "tcp" }}",
          "security": "$securityStr"
          \${if (securityConfig.isNotEmpty() || transportConfig.isNotEmpty()) "," else ""}
          $securityConfig
          $separator
          $transportConfig
        }
        """
    }
}
`;

export const KOTLIN_VPN_SERVICE_SAMPLE = `package com.example.service

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Intent
import android.net.VpnService
import android.os.Build
import android.os.ParcelFileDescriptor
import android.util.Log
import androidx.core.app.NotificationCompat
import com.example.MainActivity
import com.example.data.V2RayDatabase
import com.example.data.V2RayRepository
import kotlinx.coroutines.*
import libv2ray.CoreCallbackHandler
import libv2ray.CoreController
import libv2ray.Libv2ray

class V2RayVpnService : VpnService() {

    private var interfaceDescriptor: ParcelFileDescriptor? = null
    private var coreController: CoreController? = null
    private val serviceJob = Job()
    private val serviceScope = CoroutineScope(Dispatchers.IO + serviceJob)

    companion object {
        const val ACTION_START = "com.example.service.START"
        const val ACTION_STOP  = "com.example.service.STOP"
        private const val CHANNEL_ID      = "v2ray_vpn_service_channel"
        private const val NOTIFICATION_ID = 1002
        private const val TUN_ADDR        = "10.0.0.2"
        private const val TUN_PREFIX      = 24
        private const val TUN_MTU         = 1500
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent == null) { stopSelf(); return START_NOT_STICKY }
        when (intent.action) {
            ACTION_START -> startVpn()
            ACTION_STOP  -> stopVpn()
        }
        return START_STICKY
    }

    private fun buildNotification(contentText: String): android.app.Notification {
        val pi = PendingIntent.getActivity(
            this, 0, Intent(this, MainActivity::class.java),
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M)
                PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
            else PendingIntent.FLAG_UPDATE_CURRENT
        )
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("V2Ray Dan")
            .setContentText(contentText)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentIntent(pi)
            .setOngoing(true)
            .build()
    }

    private fun updateNotification(contentText: String) {
        val nm = getSystemService(NotificationManager::class.java)
        nm?.notify(NOTIFICATION_ID, buildNotification(contentText))
    }

    private fun startVpn() {
        createNotificationChannel()
        startForeground(NOTIFICATION_ID, buildNotification("Connecting..."))

        serviceScope.launch {
            val db = V2RayDatabase.getDatabase(applicationContext)
            val repository = V2RayRepository(db)
            val server = repository.getSelectedServer()

            if (server == null) {
                repository.log("VPN", "ERROR", "No server selected.")
                withContext(Dispatchers.Main) {
                    VpnCoreManager.activeVpnCoreManager?.updateState(VpnState.ERROR)
                }
                updateNotification("Connection failed: no server selected")
                stopSelf(); return@launch
            }

            repository.log("VPN", "INFO", "Connecting to: \${server.name} (\${server.address}:\${server.port})")

            // ── 1. TUN interface ──────────────────────────────────────────
            val fd: Int
            try {
                val builder = Builder()
                    .setSession("V2RayDan")
                    .addAddress(TUN_ADDR, TUN_PREFIX)
                    .addRoute("0.0.0.0", 0)
                    .addDnsServer("1.1.1.1")
                    .addDnsServer("8.8.8.8")
                    .setMtu(TUN_MTU)
                try { builder.addDisallowedApplication(packageName) } catch (e: Exception) {}

                interfaceDescriptor = builder.establish()
                if (interfaceDescriptor == null) {
                    repository.log("TUNNEL", "ERROR", "establish() returned null.")
                    withContext(Dispatchers.Main) {
                        VpnCoreManager.activeVpnCoreManager?.updateState(VpnState.ERROR)
                    }
                    updateNotification("Connection failed: VPN interface error")
                    stopSelf(); return@launch
                }
                fd = interfaceDescriptor!!.fd
                repository.log("TUNNEL", "SUCCESS", "TUN established. fd=$fd")
            } catch (e: Exception) {
                repository.log("TUNNEL", "ERROR", "TUN build failed: \${e.localizedMessage}")
                withContext(Dispatchers.Main) {
                    VpnCoreManager.activeVpnCoreManager?.updateState(VpnState.ERROR)
                }
                updateNotification("Connection failed: VPN interface error")
                stopSelf(); return@launch
            }

            // ── 2. config ─────────────────────────────────────────────────
            val configJson = XrayConfigGenerator.generate(server, fd)
            repository.log("CONFIG", "SUCCESS", "Config ready.")

            // ── 3. xray via JNI با fd مستقیم ─────────────────────────────
            try {
                Libv2ray.initCoreEnv(filesDir.absolutePath, "")

                val callbackHandler = object : CoreCallbackHandler {
                    override fun onEmitStatus(p0: Long, p1: String?): Long {
                        Log.d("XRAY-JNI", "Status[\$p0]: \$p1")
                        return 0L
                    }

                    override fun shutdown(): Long {
                        Log.d("XRAY-JNI", "Core shutdown callback")
                        return 0L
                    }

                    override fun startup(): Long {
                        Log.d("XRAY-JNI", "Core startup callback")
                        return 0L
                    }
                }

                val controller = Libv2ray.newCoreController(callbackHandler)
                coreController = controller

                repository.log("XRAY-CORE", "INFO", "Starting xray via JNI (fd=\$fd)...")

                controller.startLoop(configJson, fd)

                repository.log("XRAY-CORE", "SUCCESS", "xray started via JNI.")
                withContext(Dispatchers.Main) {
                    VpnCoreManager.activeVpnCoreManager?.updateState(VpnState.CONNECTED)
                    VpnCoreManager.activeVpnCoreManager?.startTracking()
                }
                updateNotification("Connected to \${server.name}")

            } catch (e: Exception) {
                repository.log("VPN", "ERROR", "JNI startup failed: \${e.localizedMessage}")
                withContext(Dispatchers.Main) {
                    VpnCoreManager.activeVpnCoreManager?.updateState(VpnState.ERROR)
                }
                updateNotification("Connection failed")
                stopSelf()
            }
        }
    }

    private fun stopVpn() {
        try { coreController?.stopLoop(); coreController = null } catch (e: Exception) {
            Log.e("VPN", "xray stop: \${e.localizedMessage}")
        }
        try { interfaceDescriptor?.close(); interfaceDescriptor = null } catch (e: Exception) {
            Log.e("VPN", "TUN close: \${e.localizedMessage}")
        }

        CoroutineScope(Dispatchers.Main).launch {
            VpnCoreManager.activeVpnCoreManager?.updateState(VpnState.DISCONNECTED)
            VpnCoreManager.activeVpnCoreManager?.setConnectedServer(null)
            VpnCoreManager.activeVpnCoreManager?.stopTracking()
        }
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val db = V2RayDatabase.getDatabase(applicationContext)
                V2RayRepository(db).log("VPN", "INFO", "VPN disconnected.")
            } catch (e: Exception) {}
        }
        stopForeground(true)
        stopSelf()
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            getSystemService(NotificationManager::class.java)?.createNotificationChannel(
                NotificationChannel(CHANNEL_ID, "V2Ray Dan", NotificationManager.IMPORTANCE_LOW)
            )
        }
    }

    override fun onDestroy() {
        try { coreController?.stopLoop(); coreController = null } catch (e: Exception) {}
        try { interfaceDescriptor?.close(); interfaceDescriptor = null } catch (e: Exception) {}
        serviceJob.cancel()
        super.onDestroy()
    }
}
`;

export const JAVA_SAMPLE = `package com.example.vpn;

import java.io.InputStream;
import java.io.OutputStream;
import java.net.Socket;
import android.os.AsyncTask;
import android.util.Log;

// ⚠️ این کلاس برای مدیریت سوکت ارتباط با هسته در پس‌زمینه است
public class CoreSocketBridge {
    private static final String TAG = "CoreSocketBridge";
    private Socket socket;

    // باگ اول: اجرای سنکرون عملیات شبکه در متد ترد اصلی به جای ترد پس‌زمینه
    public void initBridgeSync(String host, int port) {
        try {
            // ایجاد سوکت در ترد اصلی اندروید باعث NetworkOnMainThreadException می‌شود!
            socket = new Socket(host, port);
            Log.d(TAG, "اتصال سوکت با موفقیت برقرار شد");
        } catch (Exception e) {
            Log.e(TAG, "خطا در برقراری اتصال سوکت", e);
        }
    }

    // باگ دوم: عدم مدیریت و بستن مناسب جریان‌ها (Stream leaks) و درگاه‌ها که منجر به نشت حافظه و اتمام توصیف‌گر فایل می‌شود
    public void transferData(byte[] data) {
        try {
            OutputStream out = socket.getOutputStream();
            out.write(data);
            out.flush();
            // جریان خروجی هیچگاه بسته نمی‌شود و در صورت خطا سوکت باز می‌ماند!
        } catch (Exception e) {
            Log.e(TAG, "خطا در ارسال داده", e);
        }
    }
}`;

export const PYTHON_SAMPLE = `import socket
import ssl
import json

# ⚠️ اسکریپت تستر برای اتصال و عیب‌یابی کانفیگ‌های VLESS بر روی پورت لایه امن SSL
def test_vless_endpoint(host, port, uuid):
    context = ssl.create_default_context()
    # باگ اول: نادیده گرفتن خطاهای گواهی SSL (معادل allowInsecure) که ترافیک را آسیب‌پذیر به شنود می‌کند
    context.check_hostname = False
    context.verify_mode = ssl.CERT_NONE
    
    # باگ دوم: عدم تنظیم Timeout برای سوکت خام. در صورت قطع شبکه ایران، اسکریپت تا ابد مسدود می‌ماند
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    try:
        conn = context.wrap_socket(s, server_hostname=host)
        conn.connect((host, port))
        
        # باگ سوم: ساخت غیر ایمن هدر پروتکل VLESS بدون در نظر گرفتن مکانیزم Padding و تراز کردن طول بسته‌ها
        vless_request = f"{uuid}\\\\x00\\\\x00"
        conn.send(vless_request.encode('utf-8'))
        
        response = conn.recv(1024)
        print("پاسخ سرور:", response)
    except Exception as e:
        print("خطا در ارتباط:", e)
    finally:
        # باگ چهارم: باز ماندن سوکت در صورت عدم خروج موفق
        pass`;

export const SCRIPT_SAMPLE = `#!/bin/bash
# ⚠️ اسکریپت نصب و پیکربندی خودکار هسته Xray-core بر روی سرورهای ابری لینوکس

echo "شروع نصب هسته Xray..."

# باگ اول: دانلود مستقیم باینری بدون تأیید کلید‌های امنیتی GPG یا هش SHA256 که خطر آلودگی باینری را به همراه دارد
curl -L -O https://github.com/XTLS/Xray-core/releases/latest/download/Xray-linux-64.zip
unzip Xray-linux-64.zip -d /usr/local/bin/

# باگ دوم: اجرای دایمی پروسه هسته فیلترشکن با دسترسی روت (root user) به جای کاربر محدود شده
cat <<EOF > /etc/systemd/system/xray.service
[Unit]
Description=Xray Service
After=network.target

[Service]
Type=simple
User=root
ExecStart=/usr/local/bin/xray run -config /etc/xray/config.json
Restart=always

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl start xray
systemctl enable xray

# باگ سوم: عدم فعال‌سازی الگوریتم کنترل تراکم BBR در هسته لینوکس که عامل اصلی ناپایداری و نوسان سرعت در شبکه‌های همراه است
echo "نصب به پایان رسید!"`;
