#养老系统

##1.后端数据传输逻辑
const base='/api/stat' 接口前缀

（1）async关键字：告诉浏览器，异步处理数据，需要等待
（2）await 在函数内部 运行这一段代码得到结果，走下一行
await.axios.get(url,{ params }) // 即拿到路径，进行下一步 
（3）export  将变量、函数打包，允许其他文件使用
export async function statElderlyAge(breaks) {} 打包statElderlyAge函数



#getData函数
async function getData(url, params = {}) {
  const res = await axios.get(url, { params });  1.url拿到路径，params是传给后端的筛选条件
  if (res && res.data) {
    if (res.data.code && res.data.code !== 200) { 2.拆箱检查
      // 后端统一返回 {code,message,data}
      throw new Error(res.data.message || '后端返回错误');
    }
    return res.data.data ?? null; 
    #??是空值运算符
    #左侧操作数如果是 null 或 undefined，则返回右侧的默认值；
    #否则返回左侧操作数（哪怕左侧是 0、''、false 这些「假值」，也会返回左侧）
    #res:axios请求返回的结果即响应对象
    #res.data 返回的数据
    #res.data.data:真正的业务数据
  }
  throw new Error('无响应');
}
e.g.
{
  "code": 200,  //200就是res.data.code
  "data": [
    {
      "name": "男性",
      "value": 23
    },
    {
      "name": "女性",
      "value": 22
    }
  ], //数组即res.data.data
  "message": "成功"  //res.data.message
}

##2.数据绑定与渲染
onMounted :页面开始加载时就会运行的函数
onMounted(() => {
  fetchAll();
  window.addEventListener('resize', () => {  //窗口自适应监听
    ageE?.resize(); genderE?.resize(); typeE?.resize(); hourE?.resize();  //?.保证安全性，防止对null对象进行属性访问
  });
});

onBeforeUnmount:在销毁页面时清理
onBeforeUnmount(() => {
  ageE?.dispose(); genderE?.dispose(); typeE?.dispose(); hourE?.dispose();
});


ref
(1)ref 是 Vue 3 组合式 API (Composition API) 中用于定义响应式数据的核心函数。
    技术定义：ref 接收一个内部值并返回一个响应式的、可变的 Ref 对象。该对象只有一个 .value 属性，指向内部值。
    核心原理：Vue 通过依赖追踪机制，监听 ref 对象 .value 属性的变化。当数据发生变更时，Vue 会自动触发与之关联的视图（DOM）更新。
(2)使用规范
    初始化：通过 const 变量名 = ref(初始值); 进行声明。
    例如：const orders = ref([]); // 声明一个初始为空数组的响应式状态
    逻辑层访问（Script）：在 <script setup> 逻辑中，必须通过 .value 属性访问或修改数据。
    例如：orders.value = list; // 将获取的数据赋值给响应式对象
    视图层访问（Template）：在 <template> 模板中，Vue 会自动执行“解包”操作，无需使用 .value。


例如：{{ orders.length }} // 直接引用变量名即可获取长度

**大屏渲染流程
a.挂载：页面打开，触发 onMounted。
b.请求：fetchAll 派 stat.js 出去拿数据（Axios）。
c.清洗：把后端给的 res.data.data 整理成 Vue 和 Echarts 认识的格式。
d.上架：通过 .value 给响应式变量赋值，画面自动刷新。
