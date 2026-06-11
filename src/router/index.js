import { createRouter, createWebHashHistory } from 'vue-router'
import Login from '../views/Login.vue'
import BigScreen from '../views/BigScreen.vue'
import Requesters from '../views/Requesters.vue'
import DispatchAnalysis from '../views/DispatchAnalysis.vue'
import RoutePlanner from '../views/RoutePlanner.vue'
import ConvergeAnalysis from '../views/ConvergeAnalysis.vue'
const routes=[
    {
        path: '/',
        redirect: '/login'
    },
    {
        path: '/login',
        name: 'Login',
        component: Login
    },
    {
        path: '/dashboard',
        name: 'Dashboard',
        component: BigScreen
    },
    { 
        path: '/requesters', 
        name: 'Requesters', 
        component: Requesters 
    },
    { 
        path: '/analysis', 
        component: DispatchAnalysis 
    },
    {
        path: '/route',
        component: RoutePlanner
    },
    {
        path: '/coverage',
        name: 'Coverage',
        component:ConvergeAnalysis
}
    
]

const router=createRouter({
    history: createWebHashHistory(),
    routes
})

export default router