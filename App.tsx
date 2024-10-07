import React, { useEffect, useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import CircularProgress from "react-native-circular-progress-indicator";
import { StatusBar } from "expo-status-bar";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Accelerometer, AccelerometerMeasurement } from "expo-sensors";

import * as TaskManager from 'expo-task-manager';
import * as Notifications from "expo-notifications";
import * as BackgroundFetch from 'expo-background-fetch';

const TASK_NAME = 'STEP_COUNT_TASK';

TaskManager.defineTask(TASK_NAME, ({ data, error }) => {
  if (error) {
    console.error(error);
    return;
  }
  
  if (data) {
    const { x, y, z } = data as AccelerometerMeasurement;
    const acceleration = Math.sqrt(x * x + y * y + z * z);

    const threshold = 1.5; // Limite para identificar um passo

    // Processa os dados de acordo com a lógica de contar passos
    if (acceleration > threshold) {
      console.log('Passo detectado!');
      // Incrementa o contador global de passos ou faz qualquer outra ação
    }
  }
});

export default function App() {
  const [data, setData] = useState<AccelerometerMeasurement>({
    x: 0,
    y: 0,
    z: 0,
    timestamp: 0,
  });
  const [isWalking, setIsWalking] = useState(false);
  const [stepCount, setStepCount] = useState(0);
  const [subscription, setSubscription] = useState<ReturnType<
    typeof Accelerometer.addListener
  > | null>(null);
  const [lastStepTime, setLastStepTime] = useState<number>(0);

  // Configurações das notificações
  useEffect(() => {
    Notifications.requestPermissionsAsync().then(({ status }) => {
      if (status !== 'granted') {
        alert('Permissões de notificações não concedidas');
      }
    });

    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: false,
        shouldSetBadge: true,
      }),
    });
  }, []);

  const updateNotification = async (steps: number) => {
    await Notifications.dismissAllNotificationsAsync();
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Contador de Passos",
        body: `Você deu ${steps} passos.`,
        sticky: true,
        autoDismiss: false,
      },
      trigger: null,
    });
  };

  const updateAccelerometerData = ({
    x,
    y,
    z,
    timestamp,
  }: AccelerometerMeasurement) => {
    setData({ x, y, z, timestamp });

    const acceleration = Math.sqrt(x * x + y * y + z * z);
    const threshold = 1.5;
    const currentTime = Date.now();

    if (acceleration > threshold) {
      const timeSinceLastStep = currentTime - lastStepTime;

      if (timeSinceLastStep > 300) {
        setIsWalking(true);
        setStepCount((prevStepCount) => {
          const newStepCount = prevStepCount + 1;
          updateNotification(newStepCount);
          return newStepCount;
        });
        setLastStepTime(currentTime);
      }
    } else {
      setIsWalking(false);
    }
  };

  const subscribe = () => {
    const subscription = Accelerometer.addListener(updateAccelerometerData);
    setSubscription(subscription);
    Accelerometer.setUpdateInterval(100);
  };

  const unsubscribe = () => {
    if (subscription) {
      subscription.remove();
      setSubscription(null);
    }
  };

  useEffect(() => {
    subscribe();
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const startBackgroundTask = async () => {
      try {
        const isRegistered = await TaskManager.isTaskRegisteredAsync(TASK_NAME);
        if (!isRegistered) {
          await BackgroundFetch.registerTaskAsync(TASK_NAME, {
            minimumInterval: 60, // O intervalo mínimo entre execuções em segundos
            stopOnTerminate: false, 
            startOnBoot: true,
          });
        }
      } catch (err) {
        console.error('Erro ao iniciar a tarefa em segundo plano:', err);
      }
    };

    startBackgroundTask();

    return () => {
      Accelerometer.removeAllListeners(); // Limpa os listeners do acelerômetro
    };
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar style="auto" backgroundColor="transparent" translucent />
      <View style={styles.contentContainer}>
        <Image
          style={styles.imgContainer}
          source={require("./src/assets/logo.png")}
          resizeMode="contain"
        />
        <CircularProgress
          value={stepCount}
          activeStrokeColor={"#2465FD"}
          activeStrokeSecondaryColor={"#C25AFF"}
          inActiveStrokeColor={"#23a3f3"}
          inActiveStrokeOpacity={0.2}
          radius={130}
          maxValue={7500}
          title="Passos"
          titleStyle={{ fontSize: 20 }}
        />
        <View style={styles.labelContainer}>
          <MaterialCommunityIcons name="bullseye-arrow" size={32} color="#376eee" />
          <Text style={styles.labeText}>
            Meta: <Text style={styles.targetText}>7500</Text> passos
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
  },
  contentContainer: {
    flex: 1,
    paddingTop: 30,
    paddingBottom: 150,
    alignItems: "center",
    justifyContent: "space-between",
  },
  imgContainer: {
    width: 250,
    marginTop: 50,
    justifyContent: "center",
    alignItems: "center",
  },
  labelContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    columnGap: 6,
  },
  labeText: {
    fontSize: 18,
    color: "#245fe7",
  },
  targetText: {
    fontSize: 28,
    color: "#09266b",
  },
});