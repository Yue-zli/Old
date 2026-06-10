<template>
  <div class="page">
    <header class="page-header">
      <h2>人员管理（管理者 & 志愿者）</h2>
      <div class="header-actions">
        <button class="btn" @click="goBack">返回大屏</button>
        <button class="btn primary" @click="openAddModal">新增人员</button>
      </div>
    </header>

    <section class="lists-wrap">
      <div class="list-card">
        <h4>管理者列表</h4>
        <table class="simple-table">
          <thead><tr><th>ID</th><th>姓名</th><th>电话</th><th>区域</th><th>类型</th><th>操作</th></tr></thead>
          <tbody>
            <tr v-for="m in managers" :key="m.id">
              <td>{{ m.id }}</td>
              <td>{{ m.name }}</td>
              <td>{{ m.contact_number }}</td>
              <td>{{ m.area }}</td>
              <td>{{ m.type }}</td>
              <td><button class="small" @click="removeManager(m.id)">删除</button></td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="list-card">
        <h4>志愿者列表</h4>
        <table class="simple-table">
          <thead><tr><th>ID</th><th>姓名</th><th>电话</th><th>区域</th><th>类型</th><th>操作</th></tr></thead>
          <tbody>
            <tr v-for="v in volunteers" :key="v.id">
              <td>{{ v.id }}</td>
              <td>{{ v.name }}</td>
              <td>{{ v.contact_number }}</td>
              <td>{{ v.area }}</td>
              <td>{{ v.type }}</td>
              <td><button class="small" @click="removeVolunteer(v.id)">删除</button></td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- modal add -->
    <div v-if="showAdd" class="modal-backdrop">
      <div class="modal">
        <h3>新增人员</h3>
        <form @submit.prevent="addPerson">
          <div class="form-row"><label>角色</label>
            <select v-model="newPerson.role"><option>管理者</option><option>志愿者</option></select>
          </div>
          <div class="form-row"><label>姓名</label><input v-model="newPerson.name" required/></div>
          <div class="form-row"><label>电话</label><input v-model="newPerson.contact_number" required/></div>
          <div class="form-row"><label>区域</label><input v-model="newPerson.area" /></div>
          <div class="form-row"><label>类型</label><input v-model="newPerson.type" /></div>
          <div class="form-actions">
            <button type="button" @click="closeAdd">取消</button>
            <button type="submit" class="primary">添加</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
// src/views/Requesters.vue (改为 管理者 & 志愿者 管理)
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { mockManagers, mockVolunteers } from '../data/mockUsers.js';

const router = useRouter();
const managers = ref([...mockManagers]);
const volunteers = ref([...mockVolunteers]);

function goBack(){ router.push('/dashboard'); }

const showAdd = ref(false);
const newPerson = ref({ role:'管理者', name:'', contact_number:'', area:'', type:'' });

function openAddModal(){ newPerson.value = {role:'管理者', name:'', contact_number:'', area:'', type:''}; showAdd.value = true; }
function closeAdd(){ showAdd.value = false; }

function addPerson(){
  const p = {...newPerson.value};
  if(!p.name || !p.contact_number){ alert('请填写姓名与电话'); return; }
  const id = Date.now();
  const entry = { id, name: p.name, contact_number: p.contact_number, area: p.area, type: p.type };
  if(p.role === '管理者') managers.value.push(entry); else volunteers.value.push(entry);
  showAdd.value = false;
}

function removeManager(id){ if(confirm('确认删除？')) managers.value = managers.value.filter(m => m.id !== id); }
function removeVolunteer(id){ if(confirm('确认删除？')) volunteers.value = volunteers.value.filter(v => v.id !== id); }
</script>

<style scoped>
.page{ 
  padding:20px; 
}

.page-header{ 
  display:flex;
  justify-content:space-between; 
  align-items:center; 
  margin-bottom:16px; 
}
.header-actions{ 
  display:flex; 
  gap:8px; 
}

.btn{ 
  padding:8px 12px; 
  border-radius:6px; 
  border:none;
  background:#f0f4ff; 
  color:#1f6feb; 
  cursor:pointer; 
}

.btn.primary{
  background:#1f6feb; 
  color:#fff; 
}

.lists-wrap{ 
  display:flex; 
  gap:16px; 
}

.list-card{ 
  flex:1; 
  background:#fff; 
  padding:12px; 
  border-radius:8px; 
  box-shadow:0 6px 20px rgba(10,30,80,0.06); 
}

.simple-table{ 
  width:100%; 
  border-collapse:collapse; 
}

.simple-table thead th{ 
  padding:10px; 
  background:#fafafa; 
  text-align:left; 
  font-weight:600; 
}
.simple-table tbody td{ 
  padding:10px; 
  border-bottom:1px solid #f1f3f6; 
}

.small{ padding:4px 8px; 
  font-size:12px; 
  border-radius:4px; 
  background:#fff; 
  border:1px solid #eee; 
  cursor:pointer; 
}

/* modal */
.modal-backdrop{ 
  position:fixed; 
  inset:0; background:rgba(0,0,0,0.35); 
  display:flex; align-items:center; 
  justify-content:center; 
  z-index:2000; 
}

.modal{ 
  width:520px; 
  background:#fff; 
  padding:16px; 
  border-radius:8px; 
  box-shadow:0 12px 40px rgba(0,0,0,0.2); 
}

.form-row{ 
  display:flex; 
  gap:12px; 
  align-items:center;
  margin-bottom:10px; 
}

.form-row label{ 
  width:90px; 
}

.form-row input, select{ 
  flex:1; 
  padding:8px; 
  border-radius:6px; 
  border:1px solid #eef6ff; 
}

.form-actions{ 
  display:flex; 
  justify-content:flex-end; 
  gap:8px; 
}

.form-actions .primary{ 
  background:#1f6feb; 
  color:#fff;
  padding:8px 12px; border-radius:6px; 
  border:none; 
}
</style>