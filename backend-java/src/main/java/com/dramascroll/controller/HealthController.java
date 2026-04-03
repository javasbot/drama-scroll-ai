package com.dramascroll.controller;

import com.dramascroll.dto.ApiResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.lang.management.ManagementFactory;
import java.util.Map;

@RestController
@RequestMapping("/api/health")
public class HealthController {

    @Value("${spring.application.name:drama-scroll-java}")
    private String appName;

    @GetMapping
    public ApiResponse<Map<String, Object>> health() {
        long uptime = ManagementFactory.getRuntimeMXBean().getUptime() / 1000;
        return ApiResponse.ok(Map.of(
                "status", "healthy",
                "service", appName,
                "uptimeSeconds", uptime,
                "javaVersion", System.getProperty("java.version"),
                "timestamp", System.currentTimeMillis()
        ));
    }
}
