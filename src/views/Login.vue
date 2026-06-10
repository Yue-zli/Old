<template>
  <div class="login-bg">
    <div class="login-card">
      <h2 class="brand">养老服务系统</h2>
      <form @submit.prevent="handleLogin" class="login-form">
        <div class="form-item">
          <label>账号</label>
          <input v-model="form.username" placeholder="请输入账号" />
        </div>
        <div class="form-item">
          <label>密码</label>
          <input v-model="form.password" type="password" placeholder="请输入密码" />
        </div>
        <button class="login-btn" :disabled="isLoading">{{ isLoading ? '登录中...' : '登录' }}</button>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
const router = useRouter();

const form = ref({ username:'', password:'' });
const isLoading = ref(false);

async function handleLogin(){
  if(!form.value.username || !form.value.password){ alert('请输入账号和密码'); return; }
  isLoading.value = true;
  try{
    await new Promise(r=>setTimeout(r,800));
    if(form.value.username === 'admin' && form.value.password === '123456'){
      router.push('/dashboard');
    } else {
      alert('账号或密码错误（测试账号 admin / 123456）');
    }
  } finally { isLoading.value = false; }
}
</script>

<style scoped>
.login-bg{
  width:100vw; height:100vh; background-image: url('../images/背景图.jpg'); background-size:cover; background-position:center; display:flex; align-items:center; justify-content:center;
}
.login-card{
  width:420px;
  background:rgba(255,255,255,0.85);
  padding:28px;
  border-radius:12px;
  box-shadow:0 12px 40px rgba(0,0,0,0.18); 
}
.brand{
  text-align:center;
  color:#1f6feb;
  margin-bottom:18px; 
}
.form-item{
  margin-bottom:12px;
  display:flex;
  flex-direction:column; 
}

.form-item label{
  margin-bottom:6px;
  color:#666; 
  font-size:14px; 
}
.form-item input{
   padding:10px 12px;
  border-radius:8px;
   border:1px solid #eef6ff; 
}

.login-btn{ 
  width:100%; 
  padding:10px; 
  border-radius:8px; 
  background:#1f6feb; 
  border:none; 
  color:#fff; 
  font-size:16px; 
  cursor:pointer; }
</style>