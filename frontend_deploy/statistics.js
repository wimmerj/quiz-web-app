// Pokročilé statistiky a analytics

class StatisticsManager {
    constructor() {
        this.sessionStats = {
            startTime: Date.now(),
            questionsAnswered: 0,
            correctAnswers: 0,
            wrongAnswers: 0,
            timeSpent: 0,
            tablesUsed: new Set(),
            averageResponseTime: [],
            difficultyStats: {},
            streaks: { current: 0, best: 0 }
        };
        
        this.setupTracking();
    }
    
    setupTracking() {
        // Tracking času strávených na otázkách
        this.questionStartTime = null;
        
        // Page visibility pro pozastavení/obnovení trackingu
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.pauseTracking();
            } else {
                this.resumeTracking();
            }
        });
    }
    
    startQuestion() {
        this.questionStartTime = Date.now();
    }
    
    endQuestion(wasCorrect, questionDifficulty = 'normal') {
        if (this.questionStartTime) {
            const responseTime = Date.now() - this.questionStartTime;
            this.sessionStats.averageResponseTime.push(responseTime);
            
            this.sessionStats.questionsAnswered++;
            
            if (wasCorrect) {
                this.sessionStats.correctAnswers++;
                this.sessionStats.streaks.current++;
                this.sessionStats.streaks.best = Math.max(
                    this.sessionStats.streaks.best, 
                    this.sessionStats.streaks.current
                );
            } else {
                this.sessionStats.wrongAnswers++;
                this.sessionStats.streaks.current = 0;
            }
            
            // Statistiky podle obtížnosti
            if (!this.sessionStats.difficultyStats[questionDifficulty]) {
                this.sessionStats.difficultyStats[questionDifficulty] = {
                    total: 0,
                    correct: 0
                };
            }
            
            this.sessionStats.difficultyStats[questionDifficulty].total++;
            if (wasCorrect) {
                this.sessionStats.difficultyStats[questionDifficulty].correct++;
            }
            
            this.questionStartTime = null;
            this.saveStats();
        }
    }

    // Speciální metoda pro ústní zkoušení
    recordOralExamAnswer(score, maxScore = 100, questionDifficulty = 'normal') {
        if (this.questionStartTime) {
            const responseTime = Date.now() - this.questionStartTime;
            this.sessionStats.averageResponseTime.push(responseTime);
            
            this.sessionStats.questionsAnswered++;
            
            // Považovat za správnou pokud je skóre > 60%
            const wasCorrect = (score / maxScore) >= 0.6;
            
            if (wasCorrect) {
                this.sessionStats.correctAnswers++;
                this.sessionStats.streaks.current++;
                this.sessionStats.streaks.best = Math.max(
                    this.sessionStats.streaks.best, 
                    this.sessionStats.streaks.current
                );
            } else {
                this.sessionStats.wrongAnswers++;
                this.sessionStats.streaks.current = 0;
            }
            
            // Uložit skóre do speciální kategorie
            if (!this.sessionStats.oralExamScores) {
                this.sessionStats.oralExamScores = [];
            }
            this.sessionStats.oralExamScores.push(score);
            
            // Statistiky podle obtížnosti
            if (!this.sessionStats.difficultyStats[questionDifficulty]) {
                this.sessionStats.difficultyStats[questionDifficulty] = {
                    total: 0,
                    correct: 0
                };
            }
            
            this.sessionStats.difficultyStats[questionDifficulty].total++;
            if (wasCorrect) {
                this.sessionStats.difficultyStats[questionDifficulty].correct++;
            }
            
            this.questionStartTime = null;
            this.saveStats();
        }
    }
    
    addTableUsed(tableName) {
        this.sessionStats.tablesUsed.add(tableName);
    }
    
    pauseTracking() {
        // Implementace pozastavení trackingu
        this.trackingPaused = true;
    }
    
    resumeTracking() {
        // Implementace obnovení trackingu
        this.trackingPaused = false;
    }
    
    getSessionStatistics() {
        const stats = { ...this.sessionStats };
        stats.sessionDuration = Date.now() - stats.startTime;
        stats.averageResponseTime = this.calculateAverageResponseTime();
        stats.accuracy = stats.questionsAnswered > 0 
            ? (stats.correctAnswers / stats.questionsAnswered * 100).toFixed(1)
            : 0;
        
        return stats;
    }
    
    calculateAverageResponseTime() {
        if (this.sessionStats.averageResponseTime.length === 0) return 0;
        
        const sum = this.sessionStats.averageResponseTime.reduce((a, b) => a + b, 0);
        return Math.round(sum / this.sessionStats.averageResponseTime.length);
    }
    
    getHistoricalStats() {
        const allStats = this.loadFromStorage('user_statistics') || {};
        const currentUser = app.currentUser;
        
        if (!currentUser || !allStats[currentUser]) {
            return this.getEmptyHistoricalStats();
        }
        
        return allStats[currentUser];
    }
    
    getEmptyHistoricalStats() {
        return {
            totalSessions: 0,
            totalQuestionsAnswered: 0,
            totalCorrectAnswers: 0,
            totalTimeSpent: 0,
            bestStreak: 0,
            averageAccuracy: 0,
            favoriteTable: null,
            weeklyProgress: [],
            monthlyProgress: []
        };
    }
    
    saveStats() {
        const currentUser = app.currentUser;
        if (!currentUser) return;
        
        const allStats = this.loadFromStorage('user_statistics') || {};
        
        if (!allStats[currentUser]) {
            allStats[currentUser] = this.getEmptyHistoricalStats();
        }
        
        const userStats = allStats[currentUser];
        const sessionStats = this.getSessionStatistics();
        
        // Aktualizace historických statistik
        userStats.totalSessions++;
        userStats.totalQuestionsAnswered += sessionStats.questionsAnswered;
        userStats.totalCorrectAnswers += sessionStats.correctAnswers;
        userStats.totalTimeSpent += sessionStats.sessionDuration;
        userStats.bestStreak = Math.max(userStats.bestStreak, sessionStats.streaks.best);
        
        // Výpočet průměrné přesnosti
        userStats.averageAccuracy = userStats.totalQuestionsAnswered > 0
            ? (userStats.totalCorrectAnswers / userStats.totalQuestionsAnswered * 100).toFixed(1)
            : 0;
        
        // Nejoblíbenější tabulka
        this.updateFavoriteTable(userStats);
        
        // Týdenní a měsíční progres
        this.updateProgress(userStats, sessionStats);
        
        this.saveToStorage('user_statistics', allStats);
    }
    
    updateFavoriteTable(userStats) {
        const tableUsage = this.loadFromStorage('table_usage') || {};
        const currentUser = app.currentUser;
        
        if (!tableUsage[currentUser]) {
            tableUsage[currentUser] = {};
        }
        
        // Přidání použitých tabulek do statistik
        this.sessionStats.tablesUsed.forEach(table => {
            tableUsage[currentUser][table] = (tableUsage[currentUser][table] || 0) + 1;
        });
        
        // Najití nejpoužívanější tabulky
        let maxUsage = 0;
        let favoriteTable = null;
        
        Object.entries(tableUsage[currentUser]).forEach(([table, usage]) => {
            if (usage > maxUsage) {
                maxUsage = usage;
                favoriteTable = table;
            }
        });
        
        userStats.favoriteTable = favoriteTable;
        this.saveToStorage('table_usage', tableUsage);
    }
    
    updateProgress(userStats, sessionStats) {
        const today = new Date().toISOString().split('T')[0];
        
        // Týdenní progres
        if (!userStats.weeklyProgress) userStats.weeklyProgress = [];
        
        const weeklyEntry = userStats.weeklyProgress.find(entry => entry.date === today);
        if (weeklyEntry) {
            weeklyEntry.questionsAnswered += sessionStats.questionsAnswered;
            weeklyEntry.correctAnswers += sessionStats.correctAnswers;
        } else {
            userStats.weeklyProgress.push({
                date: today,
                questionsAnswered: sessionStats.questionsAnswered,
                correctAnswers: sessionStats.correctAnswers
            });
        }
        
        // Zachovat pouze posledních 30 dní
        userStats.weeklyProgress = userStats.weeklyProgress
            .filter(entry => {
                const entryDate = new Date(entry.date);
                const thirtyDaysAgo = new Date();
                thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                return entryDate >= thirtyDaysAgo;
            })
            .sort((a, b) => new Date(a.date) - new Date(b.date));
    }
    
    generateReport() {
        const sessionStats = this.getSessionStatistics();
        const historicalStats = this.getHistoricalStats();
        
        return {
            session: sessionStats,
            historical: historicalStats,
            insights: this.generateInsights(sessionStats, historicalStats),
            recommendations: this.generateRecommendations(sessionStats, historicalStats)
        };
    }
    
    generateInsights(sessionStats, historicalStats) {
        const insights = [];
        
        // Srovnání se současností
        if (historicalStats.averageAccuracy > 0) {
            const currentAccuracy = parseFloat(sessionStats.accuracy);
            const averageAccuracy = parseFloat(historicalStats.averageAccuracy);
            
            if (currentAccuracy > averageAccuracy + 10) {
                insights.push("🎉 Dnešní výkon je výrazně nad průměrem!");
            } else if (currentAccuracy < averageAccuracy - 10) {
                insights.push("📚 Dnes je výkon pod průměrem, možná je čas na přestávku.");
            }
        }
        
        // Analýza streaku
        if (sessionStats.streaks.best > 5) {
            insights.push(`🔥 Skvělý streak ${sessionStats.streaks.best} správných odpovědí za sebou!`);
        }
        
        // Analýza času
        const avgTime = sessionStats.averageResponseTime;
        if (avgTime > 0) {
            if (avgTime < 10000) {
                insights.push("⚡ Rychlé odpovídání - dobré tempo!");
            } else if (avgTime > 30000) {
                insights.push("🤔 Dlouhé přemýšlení - možná zkusit rychlejší tempo.");
            }
        }
        
        return insights;
    }
    
    generateRecommendations(sessionStats, historicalStats) {
        const recommendations = [];
        
        // Doporučení podle přesnosti
        const accuracy = parseFloat(sessionStats.accuracy);
        if (accuracy < 60) {
            recommendations.push("📖 Doporučujeme prostudovat si materiály před dalším kvízem.");
        } else if (accuracy > 90) {
            recommendations.push("🏆 Zkuste těžší otázky nebo jiné tabulky!");
        }
        
        // Doporučení podle obtížnosti
        Object.entries(sessionStats.difficultyStats).forEach(([difficulty, stats]) => {
            const diffAccuracy = (stats.correct / stats.total * 100).toFixed(1);
            if (difficulty === 'easy' && diffAccuracy > 95) {
                recommendations.push("➡️ Čas přejít na normální nebo těžší otázky!");
            }
        });
        
        return recommendations;
    }
    
    exportStatistics() {
        const report = this.generateReport();
        const blob = new Blob([JSON.stringify(report, null, 2)], { 
            type: 'application/json' 
        });
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `quiz_statistics_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
    
    // Helper metody
    loadFromStorage(key) {
        try {
            return JSON.parse(localStorage.getItem(`quiz_app_${key}`)) || null;
        } catch (e) {
            return null;
        }
    }
    
    saveToStorage(key, data) {
        try {
            localStorage.setItem(`quiz_app_${key}`, JSON.stringify(data));
        } catch (e) {
            console.error('Error saving statistics:', e);
        }
    }
    
    formatTime(milliseconds) {
        const seconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        
        if (hours > 0) {
            return `${hours}h ${minutes % 60}m`;
        } else if (minutes > 0) {
            return `${minutes}m ${seconds % 60}s`;
        } else {
            return `${seconds}s`;
        }
    }
}
