// workers/dataProcessor.worker.ts

// This worker runs in a background thread to process data without blocking the UI

export interface ProcessDataMessage {
  type: "process";
  payload: {
    users: any[];
    applications: any[];
    bills: any[];
    cycles: any[];
    buildings: any[];
  };
}

export interface ProcessedDataResult {
  customers: any[];
  stats: any;
}

// Self-contained processing function
function buildCustomers(
  users: any[],
  applications: any[],
  bills: any[],
  cycles: any[],
  buildings: any[],
) {
  // Process users
  const userCustomers = users.map((user: any) => {
    const userBills = bills.filter(
      (bill: any) =>
        bill.userId?._id === user._id &&
        bill.status !== "paid" &&
        !bill.isInstallationBill,
    );
    const totalBalance = userBills.reduce(
      (sum: number, bill: any) => sum + (bill.total || 0),
      0,
    );
    const overdueBills = userBills.filter(
      (bill: any) =>
        bill.status === "overdue" || new Date(bill.dueDate) < new Date(),
    );
    const userCycle = cycles.find(
      (cycle: any) =>
        cycle.userId?._id === user._id || cycle.userId === user._id,
    );

    let buildingObj = user.building || null;
    if (buildingObj && typeof buildingObj === "object" && !buildingObj._id) {
      const foundBuilding = buildings.find(
        (b) => b.buildingName === buildingObj.buildingName,
      );
      if (foundBuilding) {
        buildingObj = foundBuilding;
      }
    }

    return {
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      username: user.username,
      phoneNumber: user.phoneNumber,
      status: user.status,
      type: "user" as const,
      planName: user.planId?.name || "No Plan",
      planPrice: user.planId?.price || 0,
      currentBalance: totalBalance,
      unpaidBills: userBills,
      overdueBills: overdueBills,
      billingCycle: userCycle || null,
      installationFee: 0,
      installationFeePaid: true,
      building: buildingObj,
      unitNumber: user.unitNumber,
      floor: user.floor,
    };
  });

  // Process applications
  const applicationCustomers = applications
    .filter(
      (app: any) => app.status === "approved" || app.billingStarted === true,
    )
    .map((app: any) => {
      const appBills = bills.filter(
        (bill: any) =>
          bill.applicationId === app.applicationId &&
          bill.status !== "paid" &&
          !bill.isInstallationBill,
      );
      const totalBalance = appBills.reduce(
        (sum: number, bill: any) => sum + (bill.total || 0),
        0,
      );
      const overdueBills = appBills.filter(
        (bill: any) =>
          bill.status === "overdue" || new Date(bill.dueDate) < new Date(),
      );
      const appCycle = cycles.find(
        (cycle: any) => cycle.applicationId === app.applicationId,
      );

      let buildingObj = null;
      if (app.buildingId) {
        if (typeof app.buildingId === "object" && app.buildingId._id) {
          buildingObj = app.buildingId;
        } else if (typeof app.buildingId === "string") {
          const foundBuilding = buildings.find(
            (b) =>
              b._id === app.buildingId || b.buildingName === app.buildingId,
          );
          if (foundBuilding) {
            buildingObj = foundBuilding;
          }
        }
      }
      if (!buildingObj && app.buildingName) {
        const foundBuilding = buildings.find(
          (b) => b.buildingName === app.buildingName,
        );
        if (foundBuilding) {
          buildingObj = foundBuilding;
        } else {
          buildingObj = { buildingName: app.buildingName };
        }
      }

      return {
        _id: app._id,
        firstName: app.firstName,
        lastName: app.lastName,
        email: app.email,
        phoneNumber: app.phoneNumber,
        status: app.billingStarted ? "billing_started" : "approved",
        type: "application" as const,
        planName: app.planId?.name || "No Plan",
        planPrice: app.planId?.price || 0,
        currentBalance: totalBalance,
        unpaidBills: appBills,
        overdueBills: overdueBills,
        billingCycle: appCycle || null,
        applicationId: app.applicationId,
        installationFee: app.installationFee || 0,
        installationFeePaid: app.installationFeePaid || false,
        building: buildingObj,
        unitNumber: app.unitNumber,
        floor: app.floor,
      };
    });

  const allCustomers = [...userCustomers, ...applicationCustomers];
  allCustomers.sort((a, b) => b.currentBalance - a.currentBalance);

  // Calculate stats
  const totalBalance = allCustomers.reduce(
    (sum, c) => sum + c.currentBalance,
    0,
  );
  const customersWithBalance = allCustomers.filter(
    (c) => c.currentBalance > 0,
  ).length;
  const overdueCustomers = allCustomers.filter(
    (c) => c.overdueBills.length > 0,
  ).length;
  const activeCycles = cycles.filter((c: any) => c.status === "active").length;
  const pausedCycles = cycles.filter((c: any) => c.status === "paused").length;
  const applicationsWithoutBilling = applications.filter(
    (app: any) => app.status === "approved" && !app.billingStarted,
  ).length;

  const totalInstallationFeesDue = allCustomers
    .filter(
      (c) =>
        c.type === "application" &&
        !c.installationFeePaid &&
        (c.installationFee || 0) > 0,
    )
    .reduce((sum, c) => sum + (c.installationFee || 0), 0);
  const installationFeesPaid = allCustomers.filter(
    (c) => c.type === "application" && c.installationFeePaid,
  ).length;

  const stats = {
    totalCustomers: allCustomers.length,
    totalBalance,
    customersWithBalance,
    overdueCustomers,
    activeCycles,
    pausedCycles,
    applicationsWithoutBilling,
    totalInstallationFeesDue,
    installationFeesPaid,
  };

  return { customers: allCustomers, stats };
}

// Worker message handler
self.onmessage = (event: MessageEvent<ProcessDataMessage>) => {
  if (event.data.type === "process") {
    const { users, applications, bills, cycles, buildings } =
      event.data.payload;

    try {
      const result = buildCustomers(
        users,
        applications,
        bills,
        cycles,
        buildings,
      );
      self.postMessage({
        type: "complete",
        payload: result,
      });
    } catch (error) {
      self.postMessage({
        type: "error",
        payload: { message: (error as Error).message },
      });
    }
  }
};

export default {}; // Required for worker to work as module
