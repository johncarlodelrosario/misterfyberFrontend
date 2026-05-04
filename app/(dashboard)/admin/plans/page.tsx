"use client";

import { useState, useEffect } from "react";
import {
  getPlans,
  createPlan,
  updatePlan,
  deletePlan,
  Plan,
} from "@/services/plan";
import { FiPlus, FiEdit2, FiTrash2, FiX } from "react-icons/fi";
import toast from "react-hot-toast";

export default function AdminPlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    speed: { download: "", upload: "" },
    features: [""],
    duration: "30",
    mikrotikProfile: "default",
  });

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    try {
      const data = await getPlans();
      setPlans(data);
    } catch (error) {
      console.error("Failed to load plans:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const planData = {
        name: formData.name,
        description: formData.description,
        price: parseFloat(formData.price),
        speed: {
          download: parseInt(formData.speed.download),
          upload: parseInt(formData.speed.upload),
        },
        features: formData.features.filter((f) => f.trim()),
        duration: parseInt(formData.duration),
        mikrotikProfile: formData.mikrotikProfile,
      };

      if (editingPlan) {
        await updatePlan(editingPlan._id, planData);
        toast.success("Plan updated successfully");
      } else {
        await createPlan(planData);
        toast.success("Plan created successfully");
      }
      loadPlans();
      setShowModal(false);
      resetForm();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to save plan");
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this plan?")) {
      try {
        await deletePlan(id);
        toast.success("Plan deleted successfully");
        loadPlans();
      } catch (error) {
        toast.error("Failed to delete plan");
      }
    }
  };

  const resetForm = () => {
    setEditingPlan(null);
    setFormData({
      name: "",
      description: "",
      price: "",
      speed: { download: "", upload: "" },
      features: [""],
      duration: "30",
      mikrotikProfile: "default",
    });
  };

  const editPlan = (plan: Plan) => {
    setEditingPlan(plan);
    setFormData({
      name: plan.name,
      description: plan.description,
      price: plan.price.toString(),
      speed: {
        download: plan.speed.download.toString(),
        upload: plan.speed.upload.toString(),
      },
      features: plan.features.length ? plan.features : [""],
      duration: plan.duration.toString(),
      mikrotikProfile: plan.mikrotikProfile || "default",
    });
    setShowModal(true);
  };

  const addFeature = () => {
    setFormData({ ...formData, features: [...formData.features, ""] });
  };

  const removeFeature = (index: number) => {
    setFormData({
      ...formData,
      features: formData.features.filter((_, i) => i !== index),
    });
  };

  const updateFeature = (index: number, value: string) => {
    const newFeatures = [...formData.features];
    newFeatures[index] = value;
    setFormData({ ...formData, features: newFeatures });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Internet Plans</h1>
          <p className="text-gray-600">Manage your service plans and pricing</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="btn-primary flex items-center gap-2"
        >
          <FiPlus /> Add Plan
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <div
            key={plan._id}
            className="card p-6 hover:shadow-lg transition-shadow"
          >
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
                <p className="text-3xl font-bold text-primary-600 mt-2">
                  ₱{plan.price}
                </p>
                <p className="text-sm text-gray-500">per month</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => editPlan(plan)}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                >
                  <FiEdit2 />
                </button>
                <button
                  onClick={() => handleDelete(plan._id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                >
                  <FiTrash2 />
                </button>
              </div>
            </div>

            <div className="mt-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Download Speed</span>
                <span className="font-semibold">
                  {plan.speed.download} Mbps
                </span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span className="text-gray-500">Upload Speed</span>
                <span className="font-semibold">{plan.speed.upload} Mbps</span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span className="text-gray-500">Duration</span>
                <span className="font-semibold">{plan.duration} days</span>
              </div>
            </div>

            <div className="mt-4">
              <p className="text-sm text-gray-600">{plan.description}</p>
              {plan.features && plan.features.length > 0 && (
                <ul className="mt-3 space-y-1">
                  {plan.features.slice(0, 3).map((feature, i) => (
                    <li key={i} className="text-sm text-gray-500">
                      ✓ {feature}
                    </li>
                  ))}
                  {plan.features.length > 3 && (
                    <li className="text-sm text-gray-400">
                      +{plan.features.length - 3} more
                    </li>
                  )}
                </ul>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">
                  {editingPlan ? "Edit Plan" : "Add New Plan"}
                </h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <FiX className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Plan Name *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Price (₱) *
                    </label>
                    <input
                      type="number"
                      value={formData.price}
                      onChange={(e) =>
                        setFormData({ ...formData, price: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Download Speed (Mbps) *
                    </label>
                    <input
                      type="number"
                      value={formData.speed.download}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          speed: {
                            ...formData.speed,
                            download: e.target.value,
                          },
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Upload Speed (Mbps) *
                    </label>
                    <input
                      type="number"
                      value={formData.speed.upload}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          speed: { ...formData.speed, upload: e.target.value },
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Duration (days) *
                    </label>
                    <input
                      type="number"
                      value={formData.duration}
                      onChange={(e) =>
                        setFormData({ ...formData, duration: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      MikroTik Profile
                    </label>
                    <input
                      type="text"
                      value={formData.mikrotikProfile}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          mikrotikProfile: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Features
                  </label>
                  {formData.features.map((feature, index) => (
                    <div key={index} className="flex gap-2 mb-2">
                      <input
                        type="text"
                        value={feature}
                        onChange={(e) => updateFeature(index, e.target.value)}
                        placeholder={`Feature ${index + 1}`}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => removeFeature(index)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        <FiX />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addFeature}
                    className="text-primary-600 text-sm hover:text-primary-700"
                  >
                    + Add Feature
                  </button>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary">
                    {editingPlan ? "Update Plan" : "Create Plan"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
