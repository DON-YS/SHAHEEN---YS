<p align="center">
  <img src="logo.png" alt="SHAHEEN - YS Logo" width="200">
</p>

<h1 align="center">SHAHEEN - YS</h1>

<p align="center">
  <strong>منصة موحدة لبناء وإدارة البنية التحتية السحابية</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Crossplane-Control%20Plane-blue" alt="Crossplane">
  <img src="https://img.shields.io/badge/KubeVirt-VM%20Engine-orange" alt="KubeVirt">
</p>

---

## 📖 نبذة عن المشروع


### 🧠 1. Crossplane — «العقل والمدير»
Crossplane هو إطار لبناء Control Plane فوق Kubernetes. فكرته الأساسية: بدل أن تكتب سكربتات منفصلة لإنشاء وإدارة الموارد، تصف الحالة التي تريدها، ثم يقوم الـControl Plane بمراقبة الواقع ومحاولة إبقائه مطابقًا للحالة المطلوبة.

**ماذا يستطيع أن يفعل؟**
- إدارة موارد Kubernetes والموارد الخارجية عبر APIs/providers/controllers.
- دعم مفهوم Composition لإنشاء API عالية المستوى تجمع عدة موارد تحت طلب واحد.
- مراقبة مستمرة للحالة وإصلاح أي انحراف (drift) تلقائياً.

### ⚡ 2. KubeVirt — «محرك الـVMs»
KubeVirt يضيف إمكانيات إدارة Virtual Machines إلى Kubernetes. فهو يضيف موارد مثل `VirtualMachine` عبر CRDs/controllers، ثم يتولى تشغيل وإيقاف وجدولة وإدارة دورة حياة الـVM.

**كيف يشغّل الـVM فعليًا؟**
- `virt-api`: يوفر واجهة API.
- `virt-controller`: يدير دورة حياة الـVM.
- `virt-handler`: يعمل على كل عقدة.
- `virt-launcher`: يشغّل عملية الـVM الفعلية باستخدام QEMU/KVM عبر libvirt.

### 🔥 القوة الحقيقية عندما تجمعهما

