"use client";

import { motion, AnimatePresence } from "framer-motion";
import { FiX, FiCheckCircle } from "react-icons/fi";

interface TermsAndConditionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept: () => void;
  planName: string;
  planSpeed: string;
}

export default function TermsAndConditionsModal({
  isOpen,
  onClose,
  onAccept,
  planName,
  planSpeed,
}: TermsAndConditionsModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative bg-[#0f172a] rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden border border-blue-800/30"
          >
            {/* Header */}
            <div className="sticky top-0 bg-[#0f172a] border-b border-gray-800 px-5 sm:px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl sm:text-2xl font-bold text-white">
                Subscription Contract
              </h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-white transition p-1"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="overflow-y-auto p-5 sm:p-6 space-y-6 text-gray-300">
              {/* Subscriber Info Placeholder */}
              <div className="bg-blue-900/20 p-4 rounded-lg border border-blue-800/30">
                <p className="text-sm text-blue-300 mb-2 font-semibold">
                  SUBSCRIBER INFORMATION
                </p>
                <p className="text-sm">
                  Subscriber's Name:{" "}
                  <span className="text-white">_________________________</span>
                </p>
                <p className="text-sm mt-1">
                  Address:{" "}
                  <span className="text-white">
                    ___________________________
                  </span>
                </p>
                <p className="text-sm mt-1">
                  Contact no.:{" "}
                  <span className="text-white">_________________</span>
                </p>
                <p className="text-sm mt-1">
                  Mister Fyber Plan:{" "}
                  <span className="text-white font-semibold">
                    {planName || "______"}
                  </span>
                </p>
                <p className="text-sm mt-1">
                  Speed:{" "}
                  <span className="text-white font-semibold">
                    {planSpeed || "___ mbps"}
                  </span>
                </p>
              </div>

              {/* Terms and Conditions Content */}
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-white border-b border-gray-700 pb-2">
                  TERMS & CONDITIONS
                </h3>

                <p className="text-sm">
                  This Internet Subscriber Service Agreement ("Agreement") is
                  entered into by and between Mister Fyber ("Service Provider")
                  and the undersigned subscriber ("Subscriber").
                </p>

                <div>
                  <h4 className="font-semibold text-white mt-4 mb-2">
                    1. Service Subscription
                  </h4>
                  <p className="text-sm">
                    The Service Provider agrees to install and provide internet
                    service to the Subscriber at the registered service address,
                    subject to the terms and conditions stated herein.
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold text-white mt-4 mb-2">
                    2. Monthly Service Fee
                  </h4>
                  <p className="text-sm">
                    The Subscriber agrees to pay the monthly subscription fee
                    based on the selected internet plan, as indicated below, on
                    or before the due date indicated in the billing statement.
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold text-white mt-4 mb-2">
                    3. Payment Terms
                  </h4>
                  <ul className="text-sm list-disc list-inside space-y-1 ml-2">
                    <li>
                      Payments must be made on time each month, on the due date
                      as indicated in the billing statement.
                    </li>
                    <li>
                      A pro-rated fee shall be paid upon installation, covering
                      service charges from the installation date until the next
                      regular billing cycle.
                    </li>
                    <li>
                      Electronic Statement of Account will be sent to
                      Subscriber's active email provided to Mister Fyber by the
                      Subscriber.
                    </li>
                    <li>
                      Failure to pay on or before the due date shall result in
                      disconnection from the service.
                    </li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold text-white mt-4 mb-2">
                    4. Contract / No Lock-in Policy
                  </h4>
                  <p className="text-sm">
                    Mister Fyber offers a no lock-in policy, meaning subscribers
                    are not required to commit to a fixed contract period.
                    Because of this setup, our internet service operates on a
                    prepaid basis, where payments are made in advance for the
                    service period to keep the connection active. However, the
                    Subscriber agrees to comply with all account obligations,
                    payment terms, and equipment responsibilities under this
                    Agreement. Failure to meet these obligations may result in
                    service suspension, equipment recovery, or other actions as
                    provided in this Agreement.
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold text-white mt-4 mb-2">
                    5. Subscriber Responsibilities
                  </h4>
                  <ul className="text-sm list-disc list-inside space-y-1 ml-2">
                    <li>
                      Provide accurate personal and installation information.
                    </li>
                    <li>Maintain the equipment in good condition.</li>
                    <li>Use the service lawfully and responsibly.</li>
                    <li>
                      Allow authorized personnel access for installation,
                      repair, pull-out, or maintenance when necessary.
                    </li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold text-white mt-4 mb-2">
                    6. Modem / Equipment Ownership
                  </h4>
                  <p className="text-sm">
                    The modem/router and other installed equipment provided by
                    the Service Provider remain the property of the Service
                    Provider unless otherwise stated.
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold text-white mt-4 mb-2">
                    7. Pull-Out of Modem / Retrieval of Equipment
                  </h4>
                  <p className="text-sm">
                    The Service Provider reserves the right to pull out or
                    retrieve the modem/equipment under the following
                    circumstances:
                  </p>
                  <ul className="text-sm list-decimal list-inside space-y-1 ml-6 mt-2">
                    <li>
                      <span className="font-medium">
                        Permanent Disconnection
                      </span>{" "}
                      – If the Subscriber requests termination of service.
                    </li>
                    <li>
                      <span className="font-medium">
                        No Payment Within Fifteen (15) Days
                      </span>{" "}
                      – If the account remains unpaid within fifteen (15) days
                      from due date.
                    </li>
                    <li>
                      <span className="font-medium">
                        Temporary Disconnection
                      </span>{" "}
                      – If the Subscriber requests temporary suspension of
                      service.
                    </li>
                  </ul>
                  <p className="text-sm mt-2">
                    In the event that any recovered device or equipment is found
                    to have physical damage, defects, or missing parts beyond
                    normal wear and tear, the Subscriber shall be held
                    responsible and charged the corresponding replacement or
                    repair cost.
                  </p>
                  <p className="text-sm mt-2">
                    If any device or equipment provided by Mister Fyber is not
                    returned upon disconnection, termination, or pull-out
                    request, Mister Fyber reserves the right to bill the
                    Subscriber for the full value of the unreturned item. Such
                    charges shall remain due and payable until fully settled in
                    accordance with Mister Fyber's billing and collection
                    policies.
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold text-white mt-4 mb-2">
                    8. Service Interruptions
                  </h4>
                  <p className="text-sm">
                    Mister Fyber shall not be held liable or considered in
                    default for any delay, interruption, or failure to provide
                    internet service caused by circumstances beyond its
                    reasonable control, including but not limited to
                    international cable faults, network outages from upstream
                    providers, natural disasters, acts of government
                    authorities, war, national emergencies, accidents, fire,
                    lightning, riots, strikes, lockouts, labor disputes,
                    epidemics, pandemics, or other force majeure events.
                  </p>
                  <p className="text-sm mt-2">
                    Furthermore, Mister Fyber shall not be responsible for
                    issues involving subscriber-owned devices, as these are
                    beyond the scope of services provided. This includes, but is
                    not limited to: (a) inability to use, malfunction, or
                    incompatibility of the subscriber's hardware, software, or
                    firmware; and (b) any security-related concerns such as
                    viruses, malware, unauthorized access, or data loss
                    affecting subscriber-owned devices.
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold text-white mt-4 mb-2">
                    9. Reconnection Policy
                  </h4>
                  <p className="text-sm">
                    In the event that the Subscriber requests reconnection, the
                    Subscriber must first fully settle all outstanding balances,
                    including any past due accounts, penalties, and applicable
                    fees. Reconnection shall only be processed upon full payment
                    of all obligations, and a reconnection fee may be charged by
                    Mister Fyber prior to the restoration of service.
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold text-white mt-4 mb-2">
                    10. Termination
                  </h4>
                  <p className="text-sm">
                    Either party may terminate this Agreement subject to
                    settlement of outstanding balances and return of Service
                    Provider-owned equipment.
                  </p>
                </div>

                <div className="mt-6 p-4 bg-blue-900/20 rounded-lg border border-blue-800/30">
                  <p className="text-sm text-blue-200">
                    By signing below, I (the "Subscriber") confirm that I avail
                    Plan {planName || "______"} with {planSpeed || "___ mbps"},
                    and I have read, understood, and agreed to the terms and
                    conditions of this Subscription Contract.
                  </p>
                  <div className="mt-4 pt-4 border-t border-blue-800/30 flex justify-between text-xs text-gray-400">
                    <span>Subscriber's Signature: _________________</span>
                    <span>Date: _________________</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-[#0f172a] border-t border-gray-800 px-5 sm:px-6 py-4 flex flex-col sm:flex-row gap-3 justify-end">
              <button
                onClick={onClose}
                className="px-4 py-2 border border-gray-600 rounded-lg text-gray-300 hover:bg-gray-800 transition text-sm"
              >
                Cancel
              </button>
              <button
                onClick={onAccept}
                className="px-4 py-2 bg-gradient-to-r from-blue-500 to-emerald-500 text-white rounded-lg font-semibold hover:shadow-lg transition text-sm flex items-center gap-2 justify-center"
              >
                <FiCheckCircle className="w-4 h-4" />I Accept the Terms and
                Conditions
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
