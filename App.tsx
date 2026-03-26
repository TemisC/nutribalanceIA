import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import ChatExpert from './components/ChatExpert';
import FoodVision from './components/FoodVision';
import Progress from './components/Progress';
import AdminPanel from './components/AdminPanel';
import Community from './components/Community';
import Inbox from './components/Inbox';
import CoachInbox from './components/CoachInbox';
import Auth from './components/Auth';
import MealPlanner from './components/MealPlanner';
import CoachMealPlanner from './components/CoachMealPlanner';
import ShoppingList from './components/ShoppingList';
import Pricing from './components/Pricing';
import Settings from './components/Settings';
import PhysicalData, { CalculatedMetrics } from './components/PhysicalData';
import CoachDashboard from './components/CoachDashboard';
import { User, ProgressLog, UserRole, CommunityPost, UserMessage, ShoppingItem, LoggedMeal, BodyMeasurements, WeeklyPlan } from './types';
import { MOCK_PROGRESS_DATA } from './constants';
import { userService, messageService, communityService, subscriptionService } from './services/api';

/* ... inside App component ... */



const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Mobile sidebar state
  const [isLoading, setIsLoading] = useState(true);
  const [metrics, setMetrics] = useState<CalculatedMetrics | null>(null);
  const [lastCalculated, setLastCalculated] = useState<number | null>(null);
  const [chatInitialInput, setChatInitialInput] = useState<string>(''); // For Nutribot pre-fill

  const handleNavigate = (tab: string, state?: any) => {
    if (tab === 'chat-nutrition' && state?.initialInput) {
      setChatInitialInput(state.initialInput);
    } else {
      setChatInitialInput('');
    }
    setActiveTab(tab);
  };

  const handleSendMessageToUser = (userId: string, text: string, type: 'chat' | 'system' = 'chat') => {
    if (!user) return Promise.reject("No user");

    // Optimistic Update
    const newMessage: UserMessage = {
      id: Date.now().toString(),
      from: 'Yo', // Or user.name, but 'Yo' distinguishes it
      senderId: user.id, // Mark as sent by me
      receiverId: userId, // Add receiverId so we know who it was sent to
      text,
      timestamp: 'Justo ahora',
      read: true,
      type
    };

    // Add to local state immediately
    const updated = { ...user, messages: [...(user.messages || []), newMessage] };
    setUser(updated);

    // API Call for Persistence
    return messageService.sendMessage(user.id, userId, text, type)
      .catch(err => {
        console.error("Failed to send message", err);
        // Optional: Revert optimistic update or show toast error
      });
  };
  const [progressLogs, setProgressLogs] = useState<ProgressLog[]>([]);
  const [loggedMeals, setLoggedMeals] = useState<LoggedMeal[]>([]);
  const [communityPosts, setCommunityPosts] = useState<CommunityPost[]>([]);
  const [communityStats, setCommunityStats] = useState<{ avgStreak: number, totalPosts: number } | undefined>(undefined);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [pendingValidations, setPendingValidations] = useState(0);
  const [pendingCommunityPosts, setPendingCommunityPosts] = useState(0);

  useEffect(() => {
    if (user) {
      // 1. Fetch Community Data (Feed & Stats) - Only if in specific tabs or generally useful? 
      // User requested "Refresh on click". So let's fetch based on tab.
      // 1. Fetch Community Data (Feed & Stats) 
      // User requested "Refresh on click". So let's fetch based on tab.
      if (activeTab === 'community' || activeTab === 'dashboard' || activeTab === 'admin-community') {
        communityService.getFeed()
          .then(posts => {
            if (Array.isArray(posts)) {
              setCommunityPosts(posts);
              if (user.role === UserRole.ADMIN || user.role === UserRole.SUPERADMIN || user.role === UserRole.COACH) {
                setPendingCommunityPosts(posts.filter(p => p.status === 'pending').length);
              }
            }
          })
          .catch(err => console.error("Failed to fetch community feed", err));

        userService.getCommunityStats()
          .then(data => {
            setCommunityStats(data.stats);
            setLeaderboard(data.leaderboard);
          })
          .catch(err => console.error("Failed to fetch community stats", err));
      }

      // 2. Fetch Progress Logs (CRITICAL for Dashboard Refresh)
      if (activeTab === 'dashboard' || activeTab === 'progress' || activeTab === 'physical-data') {
        userService.getProgress(user.id)
          .then(logs => {
            if (Array.isArray(logs)) {
              const mappedLogs: ProgressLog[] = logs.map((l: any) => ({
                date: typeof l.date === 'string' ? l.date.split('T')[0] : l.date,
                weight: l.weight,
                caloriesConsumed: l.calories_consumed,
                measurements: l.measurements_json
              }));
              // Sort by date desc
              mappedLogs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
              setProgressLogs(mappedLogs);
            }
          })
          .catch(err => console.error("Failed to fetch progress logs", err));
      }

      // 3. Admin Validations
      if (user.role === UserRole.ADMIN || user.role === UserRole.SUPERADMIN) {
        const fetchValidations = async () => {
          try {
            const [legacyData, allUsers] = await Promise.all([
              subscriptionService.getPendingRequests(),
              userService.getAllUsers()
            ]);
            const legacyCount = legacyData?.requests?.length || 0;
            const newRegCount = Array.isArray(allUsers) ? allUsers.filter(u => u.pendingPlan).length : 0;
            setPendingValidations(legacyCount + newRegCount);
          } catch (err) {
            console.error("Failed to fetch pending validations", err);
          }
        };
        fetchValidations();
      }
    }

    // --- Polling for Community Posts (Every 15s) ---
    // Only if active tab is dashboard or community
    if (activeTab === 'dashboard' || activeTab === 'community') {
      const pollFeed = setInterval(() => {
        communityService.getFeed()
          .then(posts => {
            if (Array.isArray(posts)) {
              setCommunityPosts(posts);
              if (user.role === UserRole.ADMIN || user.role === UserRole.SUPERADMIN || user.role === UserRole.COACH) {
                setPendingCommunityPosts(posts.filter(p => p.status === 'pending').length);
              }
            }
          })
          .catch(err => console.error("Feed poll error", err));
      }, 15000); // Poll every 15 seconds for snappier feel

      return () => clearInterval(pollFeed);
    }

  }, [user, activeTab]);

  // --- Real-Time Message Polling ---
  useEffect(() => {
    if (!user) return;

    const pollMessages = async () => {
      try {
        const msgs = await messageService.getInbox(user.id);
        setUser(prev => {
          if (!prev) return null;
          // Optional: Deep compare to avoid re-renders if identical?
          // For now, naive update is robust enough for light text data.
          return { ...prev, messages: msgs || [] };
        });
      } catch (err) {
        console.error("Polling error:", err);
      }
    };

    // Initial check (maybe redundant but ensures fresh data on focus)
    // pollMessages(); 

    const intervalId = setInterval(pollMessages, 3000); // Every 3 seconds

    return () => clearInterval(intervalId);
  }, [user?.id]); // Only re-subscribe if user ID changes


  const [shoppingItems, setShoppingItems] = useState<ShoppingItem[]>([
    { id: '1', name: 'Pechuga de Pollo', amount: '1kg', category: 'meat', checked: false },
    { id: '2', name: 'Espinaca Fresca', amount: '500g', category: 'produce', checked: true },
    { id: '3', name: 'Avena Integral', amount: '1 paq', category: 'pantry', checked: false },
  ]);

  // Meal Plan State
  const [currentMealPlan, setCurrentMealPlan] = useState<WeeklyPlan | null>(null);
  const [mealPlanHistory, setMealPlanHistory] = useState<WeeklyPlan[]>([]);

  const handleSaveMeal = (meal: LoggedMeal) => {
    setLoggedMeals([meal, ...loggedMeals]);

    // Only update daily calories if we have a log for today
    const today = new Date().toISOString().split('T')[0];
    const existingLogIndex = progressLogs.findIndex(l => l.date === today);

    if (existingLogIndex >= 0) {
      const updatedLogs = [...progressLogs];
      updatedLogs[existingLogIndex].caloriesConsumed += meal.calories;
      setProgressLogs(updatedLogs);

      // API Update
      if (user) {
        userService.logProgress(user.id, {
          date: today,
          weight: updatedLogs[existingLogIndex].weight,
          calories: meal.calories, // This adds to existing in backend? No, backend increments? 
          // Wait, backend model I wrote: `calories_consumed = calories_consumed + VALUES(calories_consumed)`
          // So I should send the *increment* (meal.calories). Yes.
        }).catch(console.error);
      }

    } else {
      // Create new log for today execution
      const newLog: ProgressLog = {
        date: today,
        weight: user?.biometrics.weight || 0,
        caloriesConsumed: meal.calories,
        measurements: {
          weight: user?.biometrics.weight || 0
        }
      };
      setProgressLogs([newLog, ...progressLogs]);

      // API Create
      if (user) {
        userService.logProgress(user.id, {
          date: today,
          weight: user.biometrics.weight || 0,
          calories: meal.calories,
          measurements: { weight: user.biometrics.weight || 0 }
        }).catch(console.error);
      }
    }

    alert("¡Comida guardada y calorías registradas!");
  };

  const handleAddIngredients = (ingredients: string[]) => {
    const newItems = ingredients.map(ing => ({
      id: Date.now() + Math.random().toString(),
      name: ing,
      amount: '1',
      category: 'other' as any,
      checked: false
    }));
    const updatedList = [...newItems, ...shoppingItems];
    setShoppingItems(updatedList);
    localStorage.setItem('nutrifit_shopping_list', JSON.stringify(updatedList));
    alert(`Se agregaron ${ingredients.length} ingredientes a tu lista de compras.`);
  };

  const handleSetShoppingItems = (items: ShoppingItem[]) => {
    setShoppingItems(items);
    localStorage.setItem('nutrifit_shopping_list', JSON.stringify(items));
  };

  const handleUpgrade = (role: UserRole) => {
    if (!user) return;

    let newTokens = user.tokens;
    let newPlanType: User['planType'] = 'free';

    if (role === UserRole.PRO) {
      newTokens = 750; // Monthly allowance
      newPlanType = 'pro';
    } else if (role === UserRole.PRO_MASTER) {
      newTokens = 1500; // Monthly allowance
      newPlanType = 'pro_master';
    }

    // Preserve existing tokens if they have more? Or just reset?
    // User rule says: "Los tokens se reinician cada 30 días" implying a set allowance.
    // For upgrade, let's give them the full allowance immediately.

    const updated = { ...user, role, planType: newPlanType, tokens: newTokens };
    setUser(updated);
    localStorage.setItem('nutrifit_session', JSON.stringify(updated));
    alert(`¡Felicidades! Ahora eres miembro ${role.toUpperCase()}. Tu saldo se ha actualizado a ${newTokens} tokens.`);
  };

  useEffect(() => {
    // Load User Session
    const savedUser = localStorage.getItem('nutrifit_session');
    let currentUser: User | null = null;

    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        if (parsed && parsed.email) {
          currentUser = parsed;
          setUser(parsed);

          // Check for Pending Plan (New Registration upsell)
          if (parsed.pendingPlan) {
            setActiveTab('pricing');
          }

          // API: Load Progress Logs
          userService.getProgress(parsed.id)
            .then(logs => {
              // ... (progress logs mapping) ...
              if (Array.isArray(logs)) {
                const mappedLogs: ProgressLog[] = logs.map(l => ({
                  date: typeof l.date === 'string' ? l.date.split('T')[0] : l.date,
                  weight: l.weight,
                  caloriesConsumed: l.calories_consumed,
                  measurements: l.measurements_json
                }));
                setProgressLogs(mappedLogs);
              }
            }).catch(console.error);

          // API: Load Messages (Inbox) - Initial Fetch
          import('./services/api').then(({ messageService }) => {
            messageService.getInbox(parsed.id).then(msgs => {
              setUser(curr => curr ? { ...curr, messages: msgs } : null);
            }).catch(err => console.error("Failed to load inbox", err));
          });

          // --- REAL-TIME POLL START ---
          // Poll for new messages every 3 seconds
          const msgInterval = setInterval(() => {
            // Only poll if we have a valid user ID (parsed.id is from closure, but we want to be safe)
            if (parsed && parsed.id) {
              import('./services/api').then(({ messageService }) => {
                messageService.getInbox(parsed.id).then(msgs => {
                  // Only update if different count or strictly different?
                  // For simplicity, just update. React reconciliation handles dom diffs.
                  setUser(curr => {
                    if (!curr) return null;
                    // Simple check to avoid re-renders if exactly same length? 
                    // No, content might change (read status).
                    // Let's just update.
                    return { ...curr, messages: msgs };
                  });
                }).catch(e => console.error("Polling error", e));
              });
            }
          }, 3000); // 3 seconds

          // Store interval in a way we can clear it? 
          // This useEffect runs once on mount. 
          // We need to return a cleanup function from THIS useEffect.
          // But this useEffect is huge and currently returns nothing (void).
          // I need to hook into the return of the useEffect.
          // The current code block is inside the `if (savedUser)` block.
          // I cannot return from inside the if. I must set a variable accessible to the cleanup.

          // FIXME: The structure of this useEffect is messy (lines 213-431). 
          // It has no cleanup fn.
          // I should add a separate useEffect for polling dependent on `user` state.
          // That is cleaner.
          // ABORTING EDIT HERE. will use a new tool call to add a separate useEffect.


          // Revalidate Session (Fetch fresh data from server)
          // This ensures status, tokens, and role changes are reflected on F5
          userService.getProfile(parsed.id)
            .then(freshUser => {
              if (freshUser) {
                // Merge fresh data, preserving some local-only state if sensitive?
                // Actually, server source of truth is best.
                // Especially for Status and Tokens.
                console.log("[Session] Revalidated user from server:", freshUser.status);

                // IMPORTANT: Preserving persistence messages if already loaded by getInbox which runs in parallel
                setUser(curr => {
                  if (!curr) return freshUser;
                  return { ...freshUser, messages: curr.messages };
                });

                localStorage.setItem('nutrifit_session', JSON.stringify(freshUser));

                // If the user just got deactivated while activeTab was something else, 
                // the main render logic will catch it on next render cycle
              }
            })
            .catch(err => {
              console.error("[Session] Failed to revalidate user session", err);
              // user might be deleted? or token invalid?
              // If 401/403, we should probably logout, but let's keep it safe for now.
            });

          if (parsed.id.startsWith('user_') && !['cliente1@nutrifit.ai', 'cliente2@nutrifit.ai', 'cliente3@nutrifit.ai'].includes(parsed.email)) {
            setShoppingItems([]);
            // setProgressLogs([]); // Handled by API call above eventually
          } else if (['cliente1@nutrifit.ai', 'cliente2@nutrifit.ai', 'cliente3@nutrifit.ai'].includes(parsed.email)) {
            // Demo users: Load mocks if empty
            setProgressLogs(MOCK_PROGRESS_DATA); // Only for demo
          }
        }
      } catch (e) {
        console.error("Failed to parse session", e);
        localStorage.removeItem('nutrifit_session');
      }
    }

    // Load Metrics
    const savedMetrics = localStorage.getItem('nutrifit_metrics');
    let loadedMetrics = null;

    // Priority 1: Backend Metrics (from User Object)
    if (currentUser && currentUser.metrics && currentUser.metrics.bmi) {
      // Backend returns snake_case or camelCase depending on where it came from
      // My recent controller patches ensure camelCase (bodyFat, bmi, etc)
      // But let's be safe.
      const m = currentUser.metrics;
      // Check if valid data
      if (m.bmi && m.bmr) {
        loadedMetrics = {
          bmi: m.bmi,
          bmr: m.bmr,
          tdee: m.tdee || Math.round(m.bmr * 1.2),
          bodyFat: m.bodyFat || 0,
          status: m.bmi < 18.5 ? 'Bajo Peso' : m.bmi < 25 ? 'Normal' : m.bmi < 30 ? 'Sobrepeso' : 'Obesidad' // Simple reconstruction
        };
        // Use Status from backend if I saved it? I didn't save 'status' string in DB, just numbers.
        // So I must recalculate status.

        let status = 'Normal';
        if (m.bmi < 18.5) status = 'Bajo Peso';
        else if (m.bmi >= 25 && m.bmi < 29.9) status = 'Sobrepeso';
        else if (m.bmi >= 30 && m.bmi < 34.9) status = 'Obesidad I';
        else if (m.bmi >= 35) status = 'Obesidad II';
        loadedMetrics.status = status;

        setMetrics(loadedMetrics);
        setLastCalculated(Date.now()); // Assume fresh if from login
      }
    }

    // Priority 2: Local Storage (Fallback)
    if (!loadedMetrics && savedMetrics) {
      try {
        const parsedM = JSON.parse(savedMetrics);
        const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;

        // Patch legacy data without TDEE
        if (parsedM.data && !parsedM.data.tdee && parsedM.data.bmr) {
          parsedM.data.tdee = Math.round(parsedM.data.bmr * 1.2); // Default sedentary
        }

        if (Date.now() - parsedM.timestamp < SEVEN_DAYS) {
          setMetrics(parsedM.data);
          setLastCalculated(parsedM.timestamp);
          loadedMetrics = parsedM.data;
        }
      } catch (e) {
        console.error("Failed to parse metrics", e);
      }
    }

    // Priority 3: Auto-Calculate from Biometrics (User Suggestion)
    if (!loadedMetrics && currentUser && currentUser.biometrics && currentUser.biometrics.weight && currentUser.biometrics.height) {
      const bio = currentUser.biometrics;
      const heightM = bio.height / 100;
      const bmi = parseFloat((bio.weight / (heightM * heightM)).toFixed(1));

      let status = 'Normal';
      if (bmi < 18.5) status = 'Bajo Peso';
      else if (bmi >= 25 && bmi < 29.9) status = 'Sobrepeso';
      else if (bmi >= 30 && bmi < 34.9) status = 'Obesidad I';
      else if (bmi >= 35) status = 'Obesidad II';

      // Mifflin-St Jeor
      let bmr = (10 * bio.weight) + (6.25 * bio.height) - (5 * (bio.age || 25));
      bmr += bio.gender === 'male' ? 5 : -161;

      const tdee = Math.round(bmr * 1.2); // Default sedentary
      const bodyFat = (1.20 * bmi) + (0.23 * (bio.age || 25)) - 10.8 * (bio.gender === 'male' ? 1 : 0) - 5.4;

      loadedMetrics = {
        bmi,
        bmr: Math.round(bmr),
        tdee,
        bodyFat: parseFloat(bodyFat.toFixed(1)),
        status
      };
      setMetrics(loadedMetrics);
      setLastCalculated(Date.now());
      console.log("[Auto-Calc] Metrics regenerated from persistent biometrics");
    }

    // Load Shopping List
    const savedShoppingList = localStorage.getItem('nutrifit_shopping_list');
    if (savedShoppingList) {
      try {
        setShoppingItems(JSON.parse(savedShoppingList));
      } catch (e) {
        console.error("Error loading shopping list", e);
      }
    } else if (currentUser && !currentUser.id.startsWith('user_')) {
      // Restore default demo items only if no saved list and is possibly a demo/test user 
      // (This logic might be redundant with the Auth onLogin one, but safe as fallback)
      // Actually, let's trust the onLogin to set defaults for demos, or the state init.
      // But if I reload page for a demo user, state resets.
      // So we should keep the default state init in useState.
      // If we found nothing in storage, do we overwrite the default mock data?
      // The default useState has mock data.
      // If I am a new real user, I should have empty list.
      if (currentUser.id.startsWith('user_') && !['cliente1@nutrifit.ai', 'cliente2@nutrifit.ai', 'cliente3@nutrifit.ai'].includes(currentUser.email)) {
        setShoppingItems([]);
      }
    }

    // Load Meal Plans
    const savedPlan = localStorage.getItem('nutrifit_current_plan');
    if (savedPlan) {
      try {
        setCurrentMealPlan(JSON.parse(savedPlan));
      } catch (e) {
        console.error("Error loading current plan", e);
      }
    }

    // Load History from API (Persistence Update)
    if (currentUser) {
      userService.getMealPlans()
        .then(plans => {
          if (Array.isArray(plans)) {
            setMealPlanHistory(plans);
          }
        })
        .catch(err => console.error("Failed to load meal plan history", err));
    }

    // Force redirection if new user and no metrics
    if (currentUser && !loadedMetrics) {
      setActiveTab('physical-data');
    }

    setIsLoading(false);
  }, []);

  // Auto-Calculate Metrics Property
  useEffect(() => {
    if (user && user.biometrics && user.biometrics.weight && user.biometrics.height) {
      const bio = user.biometrics;
      const heightM = bio.height / 100;
      const bmi = parseFloat((bio.weight / (heightM * heightM)).toFixed(1));

      let status = 'Normal';
      if (bmi < 18.5) status = 'Bajo Peso';
      else if (bmi >= 25 && bmi < 29.9) status = 'Sobrepeso';
      else if (bmi >= 30 && bmi < 34.9) status = 'Obesidad I';
      else if (bmi >= 35) status = 'Obesidad II';

      // Mifflin-St Jeor (Base BMR)
      let bmr = (10 * bio.weight) + (6.25 * bio.height) - (5 * (bio.age || 25));
      bmr += bio.gender === 'male' ? 5 : -161;

      // TDEE - defaulting to Moderate if not specified for robust initial view
      const activityMultipliers: Record<string, number> = {
        'sedentary': 1.2,
        'moderate': 1.55,
        'active': 1.725,
        'athlete': 1.9
      };
      const multiplier = activityMultipliers[bio.activityLevel || 'moderate'] || 1.2;
      const tdee = Math.round(bmr * multiplier);

      // Body Fat (BMI Method as base automatic)
      const bodyFat = (1.20 * bmi) + (0.23 * (bio.age || 25)) - 10.8 * (bio.gender === 'male' ? 1 : 0) - 5.4;

      const newMetrics: CalculatedMetrics = {
        bmi,
        bmr: Math.round(bmr),
        tdee,
        bodyFat: parseFloat(bodyFat.toFixed(1)),
        status
      };

      // Only update if changed to avoid loop (JSON stringify comparison)
      // Or rely on useEffect dependency chain stability (user.biometrics -> new obj -> renders -> useEffect -> setMetrics -> renders)
      // If setMetrics is same value, React bails out? metrics state is object, so ref changes.
      // Check against current metrics state.
      if (!metrics || JSON.stringify(metrics) !== JSON.stringify(newMetrics)) {
        setMetrics(newMetrics);
        setLastCalculated(Date.now());
      }
    }
  }, [user]); // React to user changes (includes biometrics updates from Settings)

  // Sync Logic
  const syncUserToDB = (updatedUser: User) => {
    try {
      const savedDB = localStorage.getItem('nutrifit_users_db');
      if (savedDB) {
        let dbUsers: User[] = JSON.parse(savedDB);
        const index = dbUsers.findIndex(u => u.id === updatedUser.id);

        if (index !== -1) {
          // Update existing user in DB
          dbUsers[index] = updatedUser;
          localStorage.setItem('nutrifit_users_db', JSON.stringify(dbUsers));
          console.log("[Sync] User synced to DB:", updatedUser.id);
        }
      }
    } catch (e) {
      console.error("[Sync] Failed to sync user to DB", e);
    }
  };

  const handleCalculateMetrics = (results: CalculatedMetrics, measurements?: BodyMeasurements) => {
    setMetrics(results);
    setLastCalculated(Date.now());
    localStorage.setItem('nutrifit_metrics', JSON.stringify({
      timestamp: Date.now(),
      data: results
    }));

    // Save measurements to Progress History
    const today = new Date().toISOString().split('T')[0];
    const newLog: ProgressLog = {
      date: today,
      weight: user?.biometrics.weight || 0,
      caloriesConsumed: 0, // Will be updated if meals are logged
      measurements: measurements || { weight: user?.biometrics.weight || 0 }
    };

    // Check if entry for today exists to merge
    const existingIdx = progressLogs.findIndex(l => l.date === today);
    let updatedLogs;
    if (existingIdx >= 0) {
      updatedLogs = [...progressLogs];
      updatedLogs[existingIdx] = {
        ...updatedLogs[existingIdx],
        measurements: { ...updatedLogs[existingIdx].measurements, ...measurements },
        weight: user?.biometrics.weight || updatedLogs[existingIdx].weight
      };
    } else {
      updatedLogs = [newLog, ...progressLogs];
    }

    setProgressLogs(updatedLogs);

    // Sync Biometrics to User Profile and Central DB
    if (user && measurements) {
      // ... (existing update user logic) ...

      // Also Log Progress to API
      userService.logProgress(user.id, {
        date: today,
        weight: measurements.weight || user.biometrics.weight,
        calories: 0, // No calories added here, just weight/measurements
        measurements: measurements
      }).catch(console.error);

      const updatedUser = {
        ...user,
        biometrics: {
          ...user.biometrics,
          weight: measurements.weight || user.biometrics.weight,
        }
      };

      setUser(updatedUser);
      localStorage.setItem('nutrifit_session', JSON.stringify(updatedUser)); // Keep session updated locally

      // API Calls
      userService.updateBiometrics(user.id, updatedUser.biometrics).catch(err => console.error("Failed to update biometrics", err));
      userService.saveMetrics(user.id, results).catch(err => console.error("Failed to save metrics", err));
    }


    // After calculation, go to dashboard to see results!
    setActiveTab('dashboard');
    alert("¡Cálculo completado! Tus nuevas medidas se han guardado en el historial y en la nube.");
  };

  // ... (Token Logic) ...

  const handleSpendTokens = (amount: number, description: string): boolean => {
    if (!user) return false;

    if (user.tokens < amount) {
      alert(`⚠️ Tokens insuficientes. Necesitas ${amount} tokens pero tienes ${user.tokens}. \n\n¡Participa en la comunidad o mejora tu plan para conseguir más!`);
      return false;
    }

    const updated = { ...user, tokens: user.tokens - amount };
    setUser(updated);
    localStorage.setItem('nutrifit_session', JSON.stringify(updated));
    syncUserToDB(updated); // Sync tokens too!

    // API Sync for Backend (Critical for Coach Dashboard visibility)
    userService.updateProfile(user.id, { tokens: updated.tokens })
      .catch(err => console.error("[Tokens] Failed to sync with backend", err));

    console.log(`[Tokens] Spent ${amount} for ${description}. New balance: ${updated.tokens}`);
    return true;
  };

  const handleEarnTokens = (amount: number) => {
    if (!user) return;
    const updated = { ...user, tokens: user.tokens + amount };
    setUser(updated);
    localStorage.setItem('nutrifit_session', JSON.stringify(updated));
    syncUserToDB(updated);

    // API Sync for Backend
    userService.updateProfile(user.id, { tokens: updated.tokens })
      .catch(err => console.error("[Tokens] Failed to sync earn with backend", err));
  };



  const handleMarkMessageRead = (id: string) => {
    if (!user) return;
    const updatedMsgs = user.messages.map(m => m.id === id ? { ...m, read: true } : m);
    const updated = { ...user, messages: updatedMsgs };
    setUser(updated);
    localStorage.setItem('nutrifit_session', JSON.stringify(updated));
  };

  const handleShareAchievement = async (content: string, type: CommunityPost['type'], image?: string) => {
    console.log("[App] handleShareAchievement called", { type, hasImage: !!image });
    if (!user) {
      console.error("[App] User not logged in");
      return;
    }

    try {
      console.log("[App] Sending request to communityService.createPost...");
      const response = await communityService.createPost(content, type, image);
      console.log("[App] Post created successfully", response);

      // Refresh feed handled by effect or manual update?
      // Let's add to state optimistically or re-fetch
      setCommunityPosts(prev => [response.post, ...prev]);

      // Check if pending status returned
      if (response.post.status === 'pending') {
        alert('¡Publicación enviada a revisión! Te notificaremos cuando el Coach la apruebe.');
      } else {
        alert(user.role === 'coach' ? '¡Publicado en tu comunidad!' : '¡Publicado con éxito!');
      }

    } catch (e) {
      console.error("[App] Failed to share post", e);
      alert(`Error al compartir publicación: ${e instanceof Error ? e.message : 'Error desconocido'}`);
    }
  };

  const handleModeratePost = (id: string) => {
    setCommunityPosts(communityPosts.filter(p => p.id !== id));
  };

  const handlePostAction = (postId: string, action: 'approve' | 'reject' | 'edit', feedback?: string) => {
    console.log("[App] handlePostAction triggered", { postId, action });
    const targetPost = communityPosts.find(p => p.id === postId);
    if (!targetPost) {
      console.error("[App] Post not found in state", postId);
      alert("Error: Publicación no encontrada en memoria. Recarga la página.");
      return;
    }

    // Approve logic
    if (action === 'approve') {
      communityService.updatePostStatus(postId, 'published')
        .then(() => {
          setCommunityPosts(communityPosts.map(p => p.id === postId ? { ...p, status: 'published' } : p));

          // Only send message if NOT SuperAdmin (to avoid duplication with Coach)
          if (user.role !== 'superadmin' && user.role !== 'admin') {
            handleSendMessageToUser(targetPost.userId, `¡Tu publicación ha sido APROBADA! Has ganado ${targetPost.tokensAwarded} tokens.`, 'system');
          }

          alert("Publicación aprobada.");
        })
        .catch(err => {
          console.error("Error updating post status", err);
          alert("Error al actualizar el estado de la publicación.");
        });
    }

    // Reject logic
    if (action === 'reject') {
      if (confirm("¿Estás seguro de rechazar esta publicación?")) {
        communityService.updatePostStatus(postId, 'rejected')
          .then(() => {
            setCommunityPosts(communityPosts.map(p => p.id === postId ? { ...p, status: 'rejected' } : p));
            handleSendMessageToUser(targetPost.userId, `Tu publicación fue rechazada. Motivo: ${feedback || 'No cumple con las normas'}.`, 'system');
          })
          .catch(err => {
            console.error("Error rejecting post", err);
          });
      }
    }

    // Edit logic
    if (action === 'edit') {
      communityService.updatePostStatus(postId, 'needs_edit')
        .then(() => {
          setCommunityPosts(communityPosts.map(p => p.id === postId ? { ...p, status: 'needs_edit' } : p));
          handleSendMessageToUser(targetPost.userId, `Tu publicación requiere cambios: ${feedback}`, 'system');
          alert("Solicitud de edición enviada.");
        })
        .catch(err => console.error("Error setting needs_edit", err));
    }
  };

  const handleLikePost = async (postId: string) => {
    if (!user) return;

    // Optimistic Update
    setCommunityPosts(prev => prev.map(p => {
      if (p.id === postId) {
        const isLiked = !p.isLiked;
        return {
          ...p,
          likes: isLiked ? p.likes + 1 : Math.max(0, p.likes - 1),
          isLiked
        };
      }
      return p;
    }));

    try {
      await communityService.likePost(postId);
    } catch (e) {
      console.error("Failed to like post", e);
      // Revert (omitted for brevity, could refetch)
    }
  };

  const handleCommentPost = async (postId: string, content: string) => {
    if (!user) return;

    // Optimistic Update (Temporary ID)
    const tempId = Date.now().toString();
    const newComment = {
      id: tempId,
      userId: user.id,
      userName: user.name,
      userAvatar: user.avatar,
      content,
      timestamp: new Date().toISOString()
    };

    setCommunityPosts(prev => prev.map(p => {
      if (p.id === postId) {
        return {
          ...p,
          comments: [...(p.comments || []), newComment]
        };
      }
      return p;
    }));

    try {
      const response = await communityService.addComment(postId, content);

      // Update with real comment data (ID, timestamp)
      setCommunityPosts(prev => prev.map(p => {
        if (p.id === postId) {
          return {
            ...p,
            comments: p.comments?.map(c => c.id === tempId ? response.comment : c)
          };
        }
        return p;
      }));
    } catch (e) {
      console.error("Failed to comment", e);
      alert("Error al enviar comentario.");
    }
  };

  const handleSaveMealPlan = (plan: WeeklyPlan) => {
    // Save as current (Local for immediate access)
    setCurrentMealPlan(plan);
    localStorage.setItem('nutrifit_current_plan', JSON.stringify(plan));

    // Save to Database via API
    if (user) {
      userService.saveMealPlan(plan)
        .then(() => {
          console.log("Meal plan saved to DB");
          // Refresh history to include new plan (with proper DB ID if needed, though we have plan ID)
          // Or just optimistically add it?
          // Optimistic update:
          if (!mealPlanHistory.some(p => p.id === plan.id)) {
            setMealPlanHistory([plan, ...mealPlanHistory]);
          }
        })
        .catch(err => {
          console.error("Failed to save meal plan to DB", err);
          alert("Error guardando el plan en el historial. Intenta de nuevo.");
        });
    }
  };

  if (isLoading) return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-emerald-500 font-bold">Cargando NutriFit...</div>;

  if (!user) {
    return <Auth onLogin={(u) => {
      // Reset state for new users (not pre-configured demos)
      if (u.id.startsWith('user_') && !['cliente1@nutrifit.ai', 'cliente2@nutrifit.ai', 'cliente3@nutrifit.ai'].includes(u.email)) {
        setShoppingItems([]);
        setProgressLogs([]);
        setMetrics(null); // Clear metrics for new users to force calculation
        localStorage.removeItem('nutrifit_metrics'); // Clear stored metrics
        setActiveTab('physical-data');
      } else {
        // Restore defaults for demos if they were cleared
        setShoppingItems([
          { id: '1', name: 'Pechuga de Pollo', amount: '1kg', category: 'meat', checked: false },
          { id: '2', name: 'Espinaca Fresca', amount: '500g', category: 'produce', checked: true },
          { id: '3', name: 'Avena Integral', amount: '1 paq', category: 'pantry', checked: false },
        ]);
        if (['cliente1@nutrifit.ai', 'cliente2@nutrifit.ai', 'cliente3@nutrifit.ai'].includes(u.email)) {
          setProgressLogs(MOCK_PROGRESS_DATA);
        } else {
          setProgressLogs([]);
        }
      }
      setUser(u);
      localStorage.setItem('nutrifit_session', JSON.stringify(u));

      // Check for Pending Plan (New Registration upsell)
      if (u.pendingPlan) {
        setActiveTab('pricing');
      }

      // Force redirect to Admin Panel for Admin/Coach roles
      if (u.role === UserRole.ADMIN || u.role === UserRole.SUPERADMIN || u.role === UserRole.COACH) {
        // Coach goes to 'admin' (Dashboard), SuperAdmin to 'admin-users' (Directory)
        setActiveTab(u.role === UserRole.COACH ? 'admin' : 'admin-users');
      }
    }} />;
  }

  const renderContent = () => {
    // Blocking Logic for Inactive Users
    if (user.status === 'inactive') {
      return (
        <div className="flex flex-col items-center justify-center h-full text-slate-400">
          <i className="fas fa-lock text-6xl mb-4 opacity-20"></i>
          <p className="text-lg font-bold opacity-40">Cuenta Inactiva</p>
        </div>
      );
    }

    // Check for PRO Plan Restrictions (Trainer Chat & Vision locked)
    if (user.planType === 'pro' && ['chat-trainer', 'vision'].includes(activeTab)) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-center p-8 animate-fadeIn">
          <div className="bg-amber-50 p-8 rounded-3xl border border-amber-100 max-w-md">
            <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6 text-3xl text-amber-500">
              <i className="fas fa-lock"></i>
            </div>
            <h2 className="text-2xl font-black text-slate-800 mb-2">Función Exclusiva</h2>
            <p className="text-slate-500 mb-6">
              Esta herramienta está disponible en los planes <strong>FREE</strong> (con tokens limitados) o <strong>PRO MASTER</strong> (ilimitado).
              <br /><br />
              Tu plan <strong>PRO</strong> se especializa en Nutrición.
            </p>
            <button
              onClick={() => setActiveTab('pricing')}
              className="bg-slate-900 text-white px-8 py-3 rounded-xl font-bold hover:bg-slate-800 transition shadow-lg shadow-slate-900/20"
            >
              Ver Planes
            </button>
          </div>
        </div>
      );
    }

    // Check if user is Admin/Coach BUT is accessing a standard tool
    const isCoachAccessingTool = user.role === UserRole.COACH && ['chat-nutrition', 'chat-trainer', 'vision', 'meal-plan', 'settings'].includes(activeTab);

    if ((user.role === UserRole.ADMIN || user.role === UserRole.SUPERADMIN || user.role === UserRole.COACH) && !isCoachAccessingTool) {
      switch (activeTab) {

        case 'admin-community': return <AdminPanel view="community" currentUser={user} communityPosts={communityPosts} onSendMessage={handleSendMessageToUser} onPostAction={handlePostAction} onShare={handleShareAchievement} onEarnTokens={handleEarnTokens} />;
        case 'admin-users': return <AdminPanel view="users" currentUser={user} communityPosts={communityPosts} onSendMessage={handleSendMessageToUser} onPostAction={handlePostAction} />;

        // Coach Inbox Route
        case 'inbox':
          if (user.role === UserRole.COACH) {
            return (
              <CoachInbox
                messages={user.messages}
                currentUserId={user.id}
                onMarkRead={handleMarkMessageRead}
                onReply={(receiverId, text) => handleSendMessageToUser(receiverId, text)}
              />
            );
          }
          return <Inbox messages={user.messages} currentUserId={user.id} onMarkRead={handleMarkMessageRead} onReply={(receiverId, text) => handleSendMessageToUser(receiverId, text)} coachId={user.coachId} />;

        case 'admin-stats': return <AdminPanel view="stats" currentUser={user} communityPosts={communityPosts} onSendMessage={handleSendMessageToUser} onPostAction={handlePostAction} />;
        case 'admin-subscriptions': return <AdminPanel view="subscriptions" currentUser={user} communityPosts={communityPosts} onSendMessage={handleSendMessageToUser} onPostAction={handlePostAction} />;
        default:
          if (user.role === UserRole.COACH) {
            return <CoachDashboard currentUser={user} onNavigateToUser={(userId) => setActiveTab('admin-users')} onSendMessage={handleSendMessageToUser} />;
          }
          return <AdminPanel view="dashboard" currentUser={user} communityPosts={communityPosts} onSendMessage={handleSendMessageToUser} onPostAction={handlePostAction} />;
      }
    }

    try {
      const currentWeight = user.biometrics?.weight || 0; // Fallback from user profile

      switch (activeTab) {
        case 'dashboard': return <Dashboard logs={progressLogs} userName={user.name} metrics={metrics} userWeight={currentWeight} userId={user.id} onShare={handleShareAchievement} />;
        case 'physical-data': {
          // Ensure sync between logs and displayed biometrics
          const latestLogWeight = progressLogs.length > 0 ? progressLogs[0].weight : (user.biometrics?.weight || 0);
          const syncedBiometrics = { ...user.biometrics, weight: latestLogWeight };
          return <PhysicalData biometrics={syncedBiometrics} metrics={metrics} lastCalculated={lastCalculated} onCalculate={handleCalculateMetrics} />;
        }
        case 'meal-plan':
          if (user.role === UserRole.COACH) {
            return (
              <CoachMealPlanner
                currentUser={user}
                onSpendTokens={(amt, desc) => handleSpendTokens(amt, desc)}
                onSavePlan={handleSaveMealPlan}
              />
            );
          }
          return (
            <MealPlanner
              onAddToCart={handleAddIngredients}
              metrics={metrics}
              biometrics={user.biometrics}
              onNavigate={handleNavigate}
              currentPlan={currentMealPlan}
              planHistory={mealPlanHistory}
              onSavePlan={handleSaveMealPlan}
              onSpendTokens={(amt, desc) => handleSpendTokens(amt, desc)}
            />
          );
        case 'shopping': return <ShoppingList items={shoppingItems} onSetItems={handleSetShoppingItems} />;
        case 'pricing': return <Pricing currentRole={user.role} currentPlanType={user.planType} currentUserId={user.id} onUpgrade={handleUpgrade} pendingPlan={user.pendingPlan} />;
        case 'settings': return (
          <Settings
            user={user}
            onUpdateUser={(updatedUser) => {
              setUser(updatedUser);
              localStorage.setItem('nutrifit_session', JSON.stringify(updatedUser));
              userService.updateProfile(updatedUser.id, updatedUser).catch(err => console.error("Failed to update profile", err));
            }}
          />
        );
        case 'community': return (
          <Community
            posts={communityPosts}
            currentUserId={user.id}
            currentUserName={user.name}
            currentUserAvatar={user.avatar}
            currentUserWeight={user.biometrics?.weight || 70}
            onShare={handleShareAchievement}
            onEarnTokens={handleEarnTokens}
            onLike={handleLikePost}
            onComment={handleCommentPost}
            onApprove={(postId) => handlePostAction(postId, 'approve')}
            onReject={(postId) => handlePostAction(postId, 'reject')}
            isModerator={user.role === UserRole.COACH || user.role === UserRole.ADMIN || user.role === UserRole.SUPERADMIN}
            stats={communityStats}
            leaderboard={leaderboard}
          />
        );
        case 'chat-nutrition': return <ChatExpert key="nutrition" biometrics={user.biometrics} onSpendToken={handleSpendTokens} mode="nutrition" initialInput={chatInitialInput} userId={user.id} />;
        case 'chat-trainer': return <ChatExpert key="trainer" biometrics={user.biometrics} onSpendToken={handleSpendTokens} mode="trainer" userId={user.id} />;
        case 'vision': return <FoodVision userId={user.id} onEarnTokens={handleEarnTokens} onSpendTokens={handleSpendTokens} onSaveMeal={handleSaveMeal} onShare={handleShareAchievement} />;
        case 'progress': return <Progress logs={progressLogs} onAddLog={(l) => setProgressLogs([...progressLogs, l])} />;
        case 'inbox': return <Inbox messages={user.messages} currentUserId={user.id} onMarkRead={handleMarkMessageRead} onReply={(receiverId, text) => handleSendMessageToUser(receiverId, text)} coachId={user.coachId} />;
        default: return <Dashboard logs={progressLogs} userName={user.name} metrics={metrics} userWeight={currentWeight} userId={user.id} onShare={handleShareAchievement} />;
      }
    } catch (renderError) {
      console.error("Error rendering tab:", activeTab, renderError);
      return <div>Error loading component {activeTab}</div>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar
        user={user}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        pendingValidations={pendingValidations}
        pendingCommunityPosts={pendingCommunityPosts}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onLogout={() => {
          setUser(null);
          setMetrics(null);
          localStorage.removeItem('nutrifit_session');
          localStorage.removeItem('nutrifit_metrics');
          localStorage.removeItem('nutrifit_current_plan');
          localStorage.removeItem('nutrifit_meal_plans');
          localStorage.removeItem('nutrifit_shopping_list');
        }} />

      {/* Mobile Hamburger Button */}
      {!isSidebarOpen && (
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="md:hidden fixed top-4 left-4 z-40 bg-slate-900 text-white p-3 rounded-xl shadow-lg border border-slate-700 active:scale-95 transition-transform"
        >
          <i className="fas fa-bars text-xl"></i>
        </button>
      )}

      {/* Main Content Area */}
      {/* Changed ml-64 to md:ml-64 (0 on mobile) and p-10 to p-4 md:p-10 */}
      <main className="md:ml-80 p-4 md:p-10 pt-20 md:pt-10 transition-all duration-300">
        {renderContent()}
      </main>
    </div>
  );
};

export default App;
