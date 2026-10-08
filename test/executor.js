const executors = {

  // =========================================================
  // 1. BASIC SUCCESS
  // =========================================================

  StepA: async (input) => {
    console.log("Executing StepA");
    return {
      success: true,
      output: "Step A completed"
    };
  },

  StepB: async (input) => {
    console.log("Executing StepB");
    return {
      success: true,
      output: "Step B completed"
    };
  },

  StepC: async (input) => {
    console.log("Executing StepC");
    return {
      success: true,
      output: "Step C completed"
    };
  },


  // =========================================================
  // 2. DATA PIPELINE
  // =========================================================

  Producer: async () => {
    console.log("Producer executing");

    return {
      success: true,
      data: {
        message: "hello",
        number: 42,
        userId: 123
      }
    };
  },

  Consumer: async (input) => {
    console.log("Consumer received:", input);

    return {
      success: true,
      output: `Consumed data: ${JSON.stringify(input)}`
    };
  },


  // =========================================================
  // 3. RETRY SUCCESS
  // =========================================================

  RetryStep: (() => {
    let attempts = 0;

    return async () => {
      attempts++;

      console.log(`RetryStep attempt ${attempts}`);

      if (attempts < 3) {
        throw new Error(`Temporary failure - attempt ${attempts}`);
      }

      return {
        success: true,
        output: "Succeeded after retries"
      };
    };
  })(),


  // =========================================================
  // 4. PERMANENT FAILURE
  // =========================================================

  FailingStep: async () => {
    console.log("FailingStep executing");

    throw new Error("Permanent failure");
  },


  // =========================================================
  // 5. TIMEOUT
  // =========================================================

  SlowStep: async () => {
    console.log("🔥 SlowStep started");

    await new Promise(resolve => setTimeout(resolve, 30000));

    console.log("🔥 SlowStep finished");

    return {
      success: true
    };
  },


  // =========================================================
  // 6. RANDOM FAILURE
  // =========================================================

  RandomStep: async () => {
    const random = Math.random();

    console.log("RandomStep random value:", random);

    if (random < 0.5) {
      throw new Error("Random failure occurred");
    }

    return {
      success: true,
      output: "RandomStep succeeded"
    };
  },


  // =========================================================
  // 7. DELAYED SUCCESS
  // =========================================================

  DelayedStep: async () => {
    console.log("DelayedStep started");

    await new Promise(resolve => setTimeout(resolve, 3000));

    console.log("DelayedStep completed");

    return {
      success: true,
      output: "Completed after 3 seconds"
    };
  },


  // =========================================================
  // 8. STEP THAT RETURNS A LOT OF DATA
  // =========================================================

  LargeDataStep: async () => {
    console.log("LargeDataStep executing");

    const data = Array.from({ length: 1000 }, (_, i) => ({
      id: i,
      value: `item-${i}`
    }));

    return {
      success: true,
      data
    };
  },


  // =========================================================
  // 9. EMPTY OUTPUT
  // =========================================================

  EmptyStep: async () => {
    console.log("EmptyStep executing");

    return {
      success: true
    };
  },


  // =========================================================
  // 10. NULL OUTPUT
  // =========================================================

  NullStep: async () => {
    console.log("NullStep executing");

    return null;
  },


  // =========================================================
  // 11. SYNCHRONOUS-STYLE SUCCESS
  // =========================================================

  SimpleStep: () => {
    console.log("SimpleStep executing");

    return {
      success: true,
      output: "Simple synchronous result"
    };
  },


  // =========================================================
  // 12. DATABASE-LIKE OPERATION
  // =========================================================

  FakeDatabaseStep: async () => {
    console.log("FakeDatabaseStep executing");

    await new Promise(resolve => setTimeout(resolve, 500));

    return {
      success: true,
      data: {
        id: 101,
        name: "Mayank",
        role: "developer"
      }
    };
  },


  // =========================================================
  // 13. API-LIKE OPERATION
  // =========================================================

  ApiCallStep: async () => {
    console.log("ApiCallStep executing");

    await new Promise(resolve => setTimeout(resolve, 1000));

    return {
      success: true,
      statusCode: 200,
      data: {
        message: "API call successful"
      }
    };
  },


  // =========================================================
  // 14. CPU-LIKE WORK
  // =========================================================

  ComputeStep: async () => {
    console.log("ComputeStep executing");

    let result = 0;

    for (let i = 0; i < 1000000; i++) {
      result += i;
    }

    return {
      success: true,
      result
    };
  },


  // =========================================================
  // 15. FINAL STEP
  // =========================================================

  FinalStep: async () => {
    console.log("FinalStep executing");

    return {
      success: true,
      output: "Workflow finished successfully"
    };
  }
};

module.exports = { executors };