# ADR-0006: Combine habits, body weight, and activity under Health

**Status:** Proposed for V2 design gate G1

**Date:** 2026-09-06

## Context

The V1 navigation treats Habits as one of three business domains. The owner wants to add fitness or weight-control capability without creating a fourth business destination that makes the iPhone bottom navigation crowded. The change must preserve LifeIndex's lightweight, local-first character and every existing habit record.

Health and fitness products offer useful patterns at very different levels of complexity:

- [Gentler Streak](https://gentlerstories.com/gentlerstreak) organizes activity and body context as one calm wellbeing experience and emphasizes progress without pressure.
- [Happy Scale](https://apps.apple.com/us/app/happy-scale/id532430574) makes weight fluctuation easier to understand with a smoothed trend and small milestones.
- [Hevy](https://www.hevyapp.com/) makes workout entry and progress review direct, but its routines, sets, exercise library, rest timers, records, and social system are substantially larger than LifeIndex's intended scope.

## Proposed decision

- Rename the top-level Habits destination to **Health** while retaining the existing Habits capability inside it.
- Keep five bottom destinations: Today, Finance, Focus, Health, and Settings. Today and Settings remain shell destinations; Finance, Focus, and Health are the three business domains.
- Make the Health overview answer three questions in one scroll: current weight direction, recent activity, and today's habit completion.
- Add only two new health record types after G1 approval:
  - body-weight entries with local date/time, weight, and optional note;
  - activity sessions with local date/time, activity type, duration, perceived intensity, and optional note.
- Retain existing `habits` and `habitRecords` unchanged and present them as the Habits section of Health.
- Keep weight and activity entry manual and local-first for V2. Direct HealthKit/Apple Health synchronization is not included. Apple's HealthKit setup requires an iOS app target and Xcode capability, which the current static PWA does not have.
- Require an additive IndexedDB migration, a versioned backup migration, and V1-to-V2 data-preservation tests before implementation can ship. Exact store names, indexes, units, validation, and rollback behavior are deferred to V2-M2 after G1.

## Scope boundary

V2 Health does not include calorie or macro tracking, meal plans, medical advice, BMI judgments, workout programming, routines, exercise libraries, sets/reps/load tracking, rest timers, personal records, social features, wearables, Apple Health/HealthKit, or cloud synchronization.

## Rationale

- “Health” is broad enough to contain durable habits, body-weight direction, and simple movement records without labeling every user goal as weight loss.
- Merging these related records avoids six bottom destinations and preserves a five-item iPhone navigation bar.
- A small weight trend and activity log provide useful longitudinal context while avoiding the complexity of a full diet or gym application.
- Existing habit data remains semantically intact, so the navigation change does not reinterpret completed check-ins.

## Consequences

- This is a material V2 scope and storage change; it supersedes the earlier assumption that V2 would be UI-only with an unchanged schema if G1 is approved.
- Health data is sensitive. Logs must exclude weight, notes, activity titles, backup bodies, and other personal values.
- Backup/export/import, restore rollback, URL Action boundaries, and physical-iPhone upgrade testing must explicitly cover the new record types.
- Direct Apple Health integration remains unavailable within the current PWA architecture. A future native wrapper or native app would require a separate product, privacy, entitlement, and deployment decision.

## Rejected alternatives

- Add Weight or Fitness as a sixth bottom destination: too crowded and fragments related daily behavior.
- Rename Habits to Weight Control: too narrow and frames all health activity around weight loss.
- Copy a full gym logger: routines, exercise libraries, sets, progressive overload, and social features exceed LifeIndex's complexity budget.
- Convert LifeIndex to SwiftUI solely for HealthKit: conflicts with the current PWA distribution model and is not required for manual local records.

## Evidence

- [Gentler Streak product overview](https://gentlerstories.com/gentlerstreak)
- [Happy Scale App Store description](https://apps.apple.com/us/app/happy-scale/id532430574)
- [Hevy product overview](https://www.hevyapp.com/)
- [Apple HealthKit documentation](https://developer.apple.com/documentation/healthkit/)
- [Apple HealthKit setup requirements](https://developer.apple.com/documentation/healthkit/setting-up-healthkit)
