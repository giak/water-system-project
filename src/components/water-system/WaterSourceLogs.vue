<template>
    <div v-if="waterSystemConfig.enableDetailedWaterSourceLogs" class="water-source-logs">
        <div class="terminal-header">
            <div class="terminal-title">Water Source Logs</div>
        </div>
        <div class="log-container">
            <div class="log-grid">
                <template v-for="log in waterSourceLogs" :key="log.timestamp">
                    <div class="log-entry">
                        <div class="log-timestamp">{{ formatTimestamp(log.timestamp) }}</div>
                        <div class="log-source">{{ log.source }}</div>
                        <div class="log-amount" :class="getFlowClass(log)">
                            {{ formatAmount(log.amount) }}
                            {{ getFlowIndicator(log) }}
                        </div>
                        <div class="log-weather">{{ log.weather || '-' }}</div>
                        <div class="log-flow-rate">{{ log.flowRate ? formatFlowRate(log.flowRate) : '-' }}</div>
                        <div class="log-quality">{{ log.quality ? formatQuality(log.quality) : '-' }}</div>
                        <div class="log-temperature">{{ log.temperature ? formatTemperature(log.temperature) : '-' }}</div>
                    </div>
                </template>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { useWaterSystem } from '@/composables/water-system/useWaterSystem';
import { waterSystemConfig } from '@/config/waterSystemConfig';
import type { WaterSourceLogEntry } from '@/types/waterSystem';
import { format } from 'date-fns';

const { waterSourceLogs } = useWaterSystem();

function formatTimestamp(timestamp: number): string {
    return format(new Date(timestamp), 'yyyy-MM-dd HH:mm:ss');
}

function formatAmount(amount: number): string {
    return Math.abs(amount).toFixed(2).padStart(8) + ' m³';
}

function getFlowIndicator(log: WaterSourceLogEntry): string {
    if (log.source === 'Dam' || log.source === 'Glacier') {
        return log.amount >= 0 ? '↑' : '↓';
    }
    return '';
}

function getFlowClass(log: WaterSourceLogEntry): string {
    if (log.source === 'Dam' || log.source === 'Glacier') {
        return log.amount >= 0 ? 'inflow' : 'outflow';
    }
    return '';
}

function formatFlowRate(flowRate: number): string {
    return `${flowRate.toFixed(2)} m³/s`;
}

function formatQuality(quality: number): string {
    return `${quality.toFixed(1)}%`;
}

function formatTemperature(temperature: number): string {
    return `${temperature.toFixed(1)}°C`;
}
</script>

