# Pulse
## AI-Driven IMU-Based Kinematic Fatigue Tracker

---

## 1. Background & Context

Currently, most amateur athletes and gym-goers rely on highly subjective metrics such as **Reps in Reserve (RIR)**, perceived exertion, or generic linear progression templates to manage training intensity and fatigue.

While these approaches are simple, they depend heavily on the user's ability to accurately judge their own fatigue. Inaccurate estimation can contribute to:

- Overtraining and excessive fatigue
- Training plateaus
- Poor recovery management
- Increased risk of musculoskeletal injury
- Suboptimal workout intensity

In professional sports science, neuromuscular fatigue can be investigated using technologies such as **surface electromyography (sEMG)**, force plates, or blood lactate analysis. However, these methods are often expensive, specialized, and impractical for everyday athletes and gym-goers.

This creates a need for an **accessible, non-invasive, and low-cost method of estimating training fatigue during resistance exercise**.

---

## 2. The Challenge

The key challenge is to develop a system capable of estimating **localized muscular fatigue during resistance training** using hardware that users already possess.

The proposed system aims to answer:

> **"How fatigued is the user becoming during a set, and how should their future training be adjusted accordingly?"**

The solution should:

1. Work with commercially available wearable devices.
2. Require no specialized laboratory equipment.
3. Analyze movement objectively rather than relying entirely on subjective RIR.
4. Detect changes in exercise movement caused by fatigue.
5. Provide actionable fatigue and performance insights.
6. Dynamically adjust future workout programming through **autoregulation**.

---

## 3. Proposed Solution

We propose an **AI-driven kinematic fatigue tracking system** that uses the **Inertial Measurement Unit (IMU)** available in commercial smartwatches.

The smartwatch's:

- **Accelerometer**
- **Gyroscope**

will continuously capture the user's wrist movement during resistance exercises.

Instead of attempting to directly measure electrical or cellular muscle fatigue, which would require specialized instrumentation, the system estimates **mechanical manifestations of fatigue** through changes in movement characteristics.

The primary approach is based on principles used in **Velocity-Based Training (VBT)**.

### Core Concept

As fatigue accumulates during a resistance-training set, the user's ability to produce force rapidly generally decreases. This can manifest as a reduction in the velocity of the concentric phase of subsequent repetitions.

The system therefore tracks changes in **concentric movement velocity** throughout the set and uses them as a practical proxy for acute fatigue.

---

# 4. Core Technical Features

## A. Velocity Loss Tracking — An Alternative to sEMG

One of the primary indicators used by the system will be **velocity loss (VL)**.

The smartwatch IMU captures three-dimensional movement data from the user's wrist.

For each repetition, the system estimates characteristics such as:

- Rep duration
- Peak acceleration
- Movement velocity
- Concentric-phase velocity
- Movement consistency

The system establishes the user's early-set performance as a baseline and compares subsequent repetitions against it.

### Velocity Loss Calculation

A simplified velocity-loss calculation can be represented as:

\[
Velocity\ Loss(\%) =
\frac{V_{baseline} - V_{rep}}
{V_{baseline}}
\times 100
\]

Where:

- \(V_{baseline}\) = velocity of the baseline/initial repetition
- \(V_{rep}\) = velocity of the current repetition

### Example

Suppose the estimated concentric velocity during the first repetition is:

**1.0 m/s**

and later decreases to:

**0.75 m/s**

Then:

\[
Velocity\ Loss =
\frac{1.0 - 0.75}{1.0}
\times 100
= 25\%
\]

The system can therefore identify a **25% reduction in movement velocity**, indicating substantial fatigue accumulation.

> **Important:** The system treats velocity loss as a *kinematic proxy for fatigue*, rather than claiming to directly measure cellular or neurological fatigue.

---

## B. Phase Segmentation — Solving the "Slow Eccentric" Problem

A major challenge in movement-based fatigue estimation is that athletes may intentionally perform slow eccentric phases.

For example, during hypertrophy training, a user may intentionally use a:

**1-second concentric + 3-second eccentric**

tempo.

If the algorithm simply measured total repetition duration, it could incorrectly interpret the longer repetition as fatigue.

To solve this problem, the system performs **exercise-phase segmentation**.

### Rep Structure

Each repetition is divided into two primary phases:

```text
┌─────────────────────────────────────────┐
│             REPETITION                  │
├───────────────────┬─────────────────────┤
│     CONCENTRIC    │      ECCENTRIC      │
│      (Pull)       │      (Release)      │
├───────────────────┼─────────────────────┤
│ Fatigue Analysis  │     Ignored for     │
│       ✓           │ velocity-loss calc. │
│                   │         ✗           │
└───────────────────┴─────────────────────┘
