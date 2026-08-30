#!/bin/bash
# ============================================================
# 寻心理测评平台 - 服务器监控脚本
# 检查项：磁盘 / 内存 / 容器状态 / 数据库 / 接口健康
# 部署位置：/root/monitor.sh
# ============================================================

DATE=$(date "+%Y-%m-%d %H:%M:%S")
MONITOR_LOG="/var/log/xunxinli-monitor.log"
ALERT_LOG="/var/log/xunxinli-alert.log"
PROJECT_DIR="/data/q.xunxinli"

# ================= 阈值配置（可按需调整） =================
DISK_WARN=70          # 磁盘预警 %
DISK_CRIT=85          # 磁盘危险 %
MEM_WARN=75           # 内存预警 %
MEM_CRIT=90           # 内存危险 %
DB_SIZE_WARN_MB=5000  # 数据库预警 5GB
DB_SIZE_CRIT_MB=10000 # 数据库危险 10GB
RESPONSE_WARN=500000  # 答卷数预警
RESPONSE_CRIT=1000000 # 答卷数危险
LOG_MAX_MB=10         # 单个日志超过则截断

# ================= 告警推送（可选） =================
# Server酱：https://sct.ftqq.com/ 申请后填入 SendKey，可推送到微信
# 留空则只写日志文件
SERVERCHAN_KEY=""

# 数据库密码（与 .env 中保持一致）
DB_USER="q_xunxinli"
DB_PASS="xunxinli_sunking18"
DB_NAME="q_xunxinli"

# ================= 函数 =================
log_info() {
    echo "[$DATE] [INFO] $1" >> "$MONITOR_LOG"
}

alert() {
    local level="$1"
    local msg="$2"
    echo "[$DATE] [$level] $msg" >> "$ALERT_LOG"

    if [ -n "$SERVERCHAN_KEY" ]; then
        curl -s -m 10 -X POST "https://sctapi.ftqq.com/${SERVERCHAN_KEY}.send" \
            --data-urlencode "title=[寻心理]${level}告警" \
            --data-urlencode "desp=$msg" > /dev/null 2>&1
    fi
}

# ---------- 1. 磁盘 ----------
check_disk() {
    local usage
    usage=$(df -h / | awk 'NR==2 {gsub("%","");print $5}')
    log_info "系统盘使用率: ${usage}%"

    if [ "$usage" -ge "$DISK_CRIT" ]; then
        alert "严重" "系统盘使用率 ${usage}%，已超危险线 ${DISK_CRIT}%。请立即清理或扩容！"
    elif [ "$usage" -ge "$DISK_WARN" ]; then
        alert "警告" "系统盘使用率 ${usage}%，已超预警线 ${DISK_WARN}%。建议清理或挂载数据盘。"
    fi
}

# ---------- 2. 内存 ----------
check_mem() {
    local total used usage
    total=$(free | awk '/Mem:/ {print $2}')
    used=$(free | awk '/Mem:/ {print $3}')
    usage=$((used * 100 / total))
    log_info "内存使用率: ${usage}%"

    if [ "$usage" -ge "$MEM_CRIT" ]; then
        alert "严重" "内存使用率 ${usage}%，已超危险线 ${MEM_CRIT}%。可能触发 OOM 导致服务被杀！"
    elif [ "$usage" -ge "$MEM_WARN" ]; then
        alert "警告" "内存使用率 ${usage}%，已超预警线 ${MEM_WARN}%。建议优化或升级内存。"
    fi
}

# ---------- 3. 容器状态 ----------
check_containers() {
    local abnormal crashed

    # 反复重启的容器一定是异常的
    abnormal=$(docker ps --filter "status=restarting" --format "{{.Names}}" 2>/dev/null | tr '\n' ' ')
    if [ -n "$abnormal" ]; then
        alert "严重" "以下容器反复重启：${abnormal}"
    fi

    # 已退出但退出码非 0 的容器（正常完成任务退出的如 certbot 不报警）
    crashed=$(docker ps -a --filter "exited=1" --format "{{.Names}} ({{.Status}})" 2>/dev/null | tr '\n' ' ')
    if [ -n "$crashed" ]; then
        alert "严重" "以下容器异常退出：${crashed}"
    fi

    if [ -z "$abnormal" ] && [ -z "$crashed" ]; then
        log_info "容器运行正常（忽略正常退出的任务容器）"
    fi
}

# ---------- 4. 数据库 ----------
check_db() {
    cd "$PROJECT_DIR" 2>/dev/null || { log_info "项目目录不存在，跳过数据库检查"; return; }

    local db_size resp_count user_count
    db_size=$(docker compose exec -T mysql mysql -u"$DB_USER" -p"$DB_PASS" -N -B -e "
        SELECT ROUND(SUM(data_length+index_length)/1024/1024,0)
        FROM information_schema.tables
        WHERE table_schema='${DB_NAME}';" 2>/dev/null | tr -d '\r')

    resp_count=$(docker compose exec -T mysql mysql -u"$DB_USER" -p"$DB_PASS" -N -B -e "
        SELECT COUNT(*) FROM Response;" 2>/dev/null | tr -d '\r')

    user_count=$(docker compose exec -T mysql mysql -u"$DB_USER" -p"$DB_PASS" -N -B -e "
        SELECT COUNT(*) FROM User;" 2>/dev/null | tr -d '\r')

    log_info "数据库 ${db_size:-0}MB | 答卷 ${resp_count:-0} | 用户 ${user_count:-0}"

    if [ -n "$db_size" ] && [ "$db_size" -ge "$DB_SIZE_CRIT_MB" ]; then
        alert "严重" "数据库已达 ${db_size}MB，超过危险线 ${DB_SIZE_CRIT_MB}MB。"
    elif [ -n "$db_size" ] && [ "$db_size" -ge "$DB_SIZE_WARN_MB" ]; then
        alert "警告" "数据库已达 ${db_size}MB，超过预警线 ${DB_SIZE_WARN_MB}MB。"
    fi

    if [ -n "$resp_count" ] && [ "$resp_count" -ge "$RESPONSE_CRIT" ]; then
        alert "严重" "答卷数已达 ${resp_count}，超过危险线 ${RESPONSE_CRIT}。必须归档或扩容。"
    elif [ -n "$resp_count" ] && [ "$resp_count" -ge "$RESPONSE_WARN" ]; then
        alert "警告" "答卷数已达 ${resp_count}，超过预警线 ${RESPONSE_WARN}。建议规划归档。"
    fi
}

# ---------- 5. 接口健康 ----------
check_api() {
    local code
    code=$(curl -s -o /dev/null -w "%{http_code}" -m 10 https://q.xunxinli.com/api/health 2>/dev/null)
    if [ "$code" != "200" ]; then
        alert "严重" "接口健康检查失败，HTTP 状态码: ${code:-无响应}"
    else
        log_info "接口健康检查正常 (200)"
    fi
}

# ---------- 6. 日志自我清理 ----------
rotate_logs() {
    for f in "$MONITOR_LOG" "$ALERT_LOG"; do
        if [ -f "$f" ]; then
            local size_mb=$(( $(stat -c %s "$f" 2>/dev/null || echo 0) / 1024 / 1024 ))
            if [ "$size_mb" -gt "$LOG_MAX_MB" ]; then
                tail -n 500 "$f" > "${f}.tmp" && mv "${f}.tmp" "$f"
            fi
        fi
    done
}

# ================= 主流程 =================
echo "========== 检查开始 $DATE ==========" >> "$MONITOR_LOG"
check_disk
check_mem
check_containers
check_db
check_api
rotate_logs
echo "" >> "$MONITOR_LOG"
