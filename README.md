# SHAHEEN - YS

<p align="center">
  <img src="logo.png" alt="SHAHEEN - YS Logo" width="200">
</p>

<p align="center">
  <strong>Unified Platform for Building and Managing Cloud Infrastructure</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Crossplane-Control%20Plane-blue" alt="Crossplane">
  <img src="https://img.shields.io/badge/KubeVirt-VM%20Engine-orange" alt="KubeVirt">
</p>

---

## 📖 Overview

This project combines two powerful open-source tools for infrastructure and virtualization management into a single repository:

### 🧠 1. Crossplane — The Brain and Manager

Crossplane is a framework for building control planes on top of Kubernetes. Instead of writing separate scripts to create and manage resources, you describe the desired state, and the control plane continuously monitors and reconciles the actual state to match it.

**Capabilities:**
- Manage Kubernetes and external resources via APIs, providers, and controllers.
- Support Composition to create high-level APIs that group multiple resources under a single request.
- Continuous drift detection and remediation.

### ⚡ 2. KubeVirt — The VM Engine

KubeVirt adds virtual machine management capabilities to Kubernetes. It introduces resources like `VirtualMachine` through CRDs and controllers, then handles scheduling, lifecycle, and operation of VMs.

**Components:**
- `virt-api`: Provides the API.
- `virt-controller`: Manages VM lifecycle.
- `virt-handler`: Runs on each node.
- `virt-launcher`: Runs the actual VM process using QEMU/KVM via libvirt.

### 🔥 The Power of Combining Them

When Crossplane and KubeVirt are integrated, you get a modern VPS cloud platform:

```text
User Interface
      ↓
     API
      ↓
Crossplane (Composition)
      ↓
provider-kubernetes
      ↓
KubeVirt CRDs
      ↓
VM / Network / Disk / IP

A user requests:

> Create Ubuntu VPS — 4 CPU — 8GB RAM — 80GB



The system automatically provisions all necessary resources.


---

🚀 Build and Installation

Prerequisites

Kubernetes cluster (v1.28+)

kubectl configured with cluster-admin privileges

Docker

Nix with Flakes enabled (for Crossplane)

Go 1.24+ (for KubeVirt)

libvirt-dev (for KubeVirt)


1. Build and Install Crossplane

cd components/crossplane

curl -L https://nixos.org/nix/install | sh

mkdir -p ~/.config/nix

echo "experimental-features = nix-command flakes" >> ~/.config/nix/nix.conf

nix build

helm install crossplane ./cluster/charts/crossplane \
  --namespace crossplane-system \
  --create-namespace

2. Build and Install KubeVirt

cd components/kubevirt

sudo apt-get install -y libvirt-dev

make cluster-up

make cluster-sync

kubectl apply -f https://github.com/kubevirt/kubevirt/releases/download/v1.7.0/kubevirt-operator.yaml

kubectl apply -f https://github.com/kubevirt/kubevirt/releases/download/v1.7.0/kubevirt-cr.yaml

3. Install provider-kubernetes

kubectl apply -f - <<EOF
apiVersion: pkg.crossplane.io/v1
kind: Provider
metadata:
  name: provider-kubernetes
spec:
  package: xpkg.upbound.io/upbound/provider-kubernetes:v0.16.0
EOF


---

📁 Project Structure

SHAHEEN-YS/
├── logo.png
├── README.md
├── .gitignore
└── components/
    ├── crossplane/
    │   ├── apis/
    │   ├── cmd/
    │   ├── cluster/
    │   ├── go.mod
    │   └── ...
    └── kubevirt/
        ├── cmd/
        ├── pkg/
        ├── hack/
        ├── go.mod
        └── ...


---

⚠️ Disclaimer

This project is intended for educational purposes and cloud infrastructure building. The user bears full legal responsibility for any unauthorized use.


---

📜 License

This project combines two separately licensed projects:

Crossplane: Apache License 2.0

KubeVirt: Apache License 2.0
