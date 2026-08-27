/**
 * 寻心理测评平台 - 种子脚本
 * 写入管理员账号与 6 个预设测评（题目/维度/报告模板）
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import {
  MBTI_TEMPLATES, DISC_TEMPLATES, BIGFIVE_TEMPLATES, COLOR_TEMPLATES, SBTI_TEMPLATES, HOLLAND_TEMPLATES, QINZI_TEMPLATES, LOVE_TEMPLATES, LAS_TEMPLATES, DIMENSION_LABELS,
} from './reportTemplates';

const prisma = new PrismaClient();

// ==================== 题库 ====================

const MBTI_QUESTIONS = [
  { id: 'mbti_1', type: 'radio', title: '在社交场合中，你通常会', dimension: 'EI', required: true, options: [{ value: '0', label: '主动与他人交谈，感觉充满活力' }, { value: '1', label: '更愿意观察，与人交流后会感到疲惫' }] },
  { id: 'mbti_2', type: 'radio', title: '周末你更倾向于', dimension: 'EI', required: true, options: [{ value: '0', label: '和朋友聚会或参加活动' }, { value: '1', label: '独自在家阅读或做自己的事' }] },
  { id: 'mbti_3', type: 'radio', title: '在团队讨论中，你通常会', dimension: 'EI', required: true, options: [{ value: '0', label: '积极发言，边想边说' }, { value: '1', label: '先倾听，想清楚了再发言' }] },
  { id: 'mbti_4', type: 'radio', title: '认识新朋友让你感到', dimension: 'EI', required: true, options: [{ value: '0', label: '兴奋和期待' }, { value: '1', label: '有些紧张，需要时间适应' }] },
  { id: 'mbti_5', type: 'radio', title: '一天高强度社交后，你更想', dimension: 'EI', required: true, options: [{ value: '0', label: '再约朋友续摊，越聊越有劲' }, { value: '1', label: '回家独处充电，恢复精力' }] },
  { id: 'mbti_6', type: 'radio', title: '别人对你的普遍印象是', dimension: 'EI', required: true, options: [{ value: '0', label: '健谈、外向、容易接近' }, { value: '1', label: '安静、内敛、慢热' }] },
  { id: 'mbti_7', type: 'radio', title: '解决问题时，你更依赖', dimension: 'SN', required: true, options: [{ value: '0', label: '过往的经验和具体事实' }, { value: '1', label: '直觉和灵感' }] },
  { id: 'mbti_8', type: 'radio', title: '学习新知识时，你更喜欢', dimension: 'SN', required: true, options: [{ value: '0', label: '按部就班，掌握实际操作' }, { value: '1', label: '先理解整体概念和理论' }] },
  { id: 'mbti_9', type: 'radio', title: '你更关注', dimension: 'SN', required: true, options: [{ value: '0', label: '当下的现实和细节' }, { value: '1', label: '未来的可能性和想象' }] },
  { id: 'mbti_10', type: 'radio', title: '读一本书时，你更在意', dimension: 'SN', required: true, options: [{ value: '0', label: '情节发展和具体描述' }, { value: '1', label: '隐喻和深层含义' }] },
  { id: 'mbti_11', type: 'radio', title: '安装新软件时，你会', dimension: 'SN', required: true, options: [{ value: '0', label: '先读说明书，按步骤操作' }, { value: '1', label: '直接摸索试错，边玩边学' }] },
  { id: 'mbti_12', type: 'radio', title: '描述一件事情时，你倾向于', dimension: 'SN', required: true, options: [{ value: '0', label: '陈述事实，讲清来龙去脉' }, { value: '1', label: '展开联想，谈它的可能意义' }] },
  { id: 'mbti_13', type: 'radio', title: '做重要决定时，你更看重', dimension: 'TF', required: true, options: [{ value: '0', label: '逻辑分析和客观事实' }, { value: '1', label: '个人价值观和他人感受' }] },
  { id: 'mbti_14', type: 'radio', title: '朋友向你倾诉烦恼，你通常会', dimension: 'TF', required: true, options: [{ value: '0', label: '帮TA分析问题，提出解决方案' }, { value: '1', label: '先共情，给予情感支持' }] },
  { id: 'mbti_15', type: 'radio', title: '在争论中，你更看重', dimension: 'TF', required: true, options: [{ value: '0', label: '谁的观点更合理' }, { value: '1', label: '不伤害彼此的感情' }] },
  { id: 'mbti_16', type: 'radio', title: '你认为公平最重要的是', dimension: 'TF', required: true, options: [{ value: '0', label: '一视同仁，规则面前人人平等' }, { value: '1', label: '考虑每个人的特殊情况' }] },
  { id: 'mbti_17', type: 'radio', title: '当规则与人性冲突时，你更倾向于', dimension: 'TF', required: true, options: [{ value: '0', label: '坚持原则，维护制度' }, { value: '1', label: '体谅人情，灵活变通' }] },
  { id: 'mbti_18', type: 'radio', title: '你更愿意别人称赞你', dimension: 'TF', required: true, options: [{ value: '0', label: '理性客观，判断精准' }, { value: '1', label: '善解人意，温暖可靠' }] },
  { id: 'mbti_19', type: 'radio', title: '面对工作任务，你更习惯', dimension: 'JP', required: true, options: [{ value: '0', label: '制定详细计划，按步骤执行' }, { value: '1', label: '灵活应对，随机应变' }] },
  { id: 'mbti_20', type: 'radio', title: '旅行时，你更倾向于', dimension: 'JP', required: true, options: [{ value: '0', label: '提前规划好行程和住宿' }, { value: '1', label: '走到哪算哪，享受随性的旅程' }] },
  { id: 'mbti_21', type: 'radio', title: '截止日期临近时，你通常', dimension: 'JP', required: true, options: [{ value: '0', label: '早就完成了，最后只是检查' }, { value: '1', label: '在最后关头高效冲刺完成' }] },
  { id: 'mbti_22', type: 'radio', title: '你的桌面或房间通常是', dimension: 'JP', required: true, options: [{ value: '0', label: '整洁有序，东西各有其位' }, { value: '1', label: '有点乱但我知道东西在哪' }] },
  { id: 'mbti_23', type: 'radio', title: '面对突然的计划变更，你', dimension: 'JP', required: true, options: [{ value: '0', label: '有些不适，希望重新排好计划' }, { value: '1', label: '欣然接受，正好体验新可能' }] },
  { id: 'mbti_24', type: 'radio', title: '你更享受', dimension: 'JP', required: true, options: [{ value: '0', label: '把事情收尾、做出结论的踏实感' }, { value: '1', label: '让选项保持开放、不急于定论的轻松' }] },
];

const DISC_QUESTIONS = [
  { id: 'disc_1', type: 'scale', title: '我喜欢接受挑战和竞争', dimension: 'D', required: true, scaleConfig: { min: 1, max: 5, minLabel: '非常不符合', maxLabel: '非常符合', type: 'number' } },
  { id: 'disc_2', type: 'scale', title: '我习惯直接表达自己的观点', dimension: 'D', required: true, scaleConfig: { min: 1, max: 5, minLabel: '非常不符合', maxLabel: '非常符合', type: 'number' } },
  { id: 'disc_3', type: 'scale', title: '我追求快速达成结果', dimension: 'D', required: true, scaleConfig: { min: 1, max: 5, minLabel: '非常不符合', maxLabel: '非常符合', type: 'number' } },
  { id: 'disc_4', type: 'scale', title: '我愿意承担风险去做决定', dimension: 'D', required: true, scaleConfig: { min: 1, max: 5, minLabel: '非常不符合', maxLabel: '非常符合', type: 'number' } },
  { id: 'disc_5', type: 'scale', title: '我喜欢成为众人关注的焦点', dimension: 'I', required: true, scaleConfig: { min: 1, max: 5, minLabel: '非常不符合', maxLabel: '非常符合', type: 'number' } },
  { id: 'disc_6', type: 'scale', title: '我能轻松与陌生人建立联系', dimension: 'I', required: true, scaleConfig: { min: 1, max: 5, minLabel: '非常不符合', maxLabel: '非常符合', type: 'number' } },
  { id: 'disc_7', type: 'scale', title: '我善于用热情感染他人', dimension: 'I', required: true, scaleConfig: { min: 1, max: 5, minLabel: '非常不符合', maxLabel: '非常符合', type: 'number' } },
  { id: 'disc_8', type: 'scale', title: '我偏好团队合作而非独自工作', dimension: 'I', required: true, scaleConfig: { min: 1, max: 5, minLabel: '非常不符合', maxLabel: '非常符合', type: 'number' } },
  { id: 'disc_9', type: 'scale', title: '我善于倾听并理解他人感受', dimension: 'S', required: true, scaleConfig: { min: 1, max: 5, minLabel: '非常不符合', maxLabel: '非常符合', type: 'number' } },
  { id: 'disc_10', type: 'scale', title: '我更喜欢稳定的环境而非频繁变动', dimension: 'S', required: true, scaleConfig: { min: 1, max: 5, minLabel: '非常不符合', maxLabel: '非常符合', type: 'number' } },
  { id: 'disc_11', type: 'scale', title: '我做事有耐心且持之以恒', dimension: 'S', required: true, scaleConfig: { min: 1, max: 5, minLabel: '非常不符合', maxLabel: '非常符合', type: 'number' } },
  { id: 'disc_12', type: 'scale', title: '我会尽量避免与人发生冲突', dimension: 'S', required: true, scaleConfig: { min: 1, max: 5, minLabel: '非常不符合', maxLabel: '非常符合', type: 'number' } },
  { id: 'disc_13', type: 'scale', title: '我注重细节和准确性', dimension: 'C', required: true, scaleConfig: { min: 1, max: 5, minLabel: '非常不符合', maxLabel: '非常符合', type: 'number' } },
  { id: 'disc_14', type: 'scale', title: '我倾向于基于数据而非直觉做决策', dimension: 'C', required: true, scaleConfig: { min: 1, max: 5, minLabel: '非常不符合', maxLabel: '非常符合', type: 'number' } },
  { id: 'disc_15', type: 'scale', title: '我遵循规则和流程', dimension: 'C', required: true, scaleConfig: { min: 1, max: 5, minLabel: '非常不符合', maxLabel: '非常符合', type: 'number' } },
  { id: 'disc_16', type: 'scale', title: '我倾向于仔细分析后再做决定', dimension: 'C', required: true, scaleConfig: { min: 1, max: 5, minLabel: '非常不符合', maxLabel: '非常符合', type: 'number' } },
];

const COMM_OPTIONS = [
  { value: '1', label: '完全不符合' },
  { value: '2', label: '比较不符合' },
  { value: '3', label: '一般' },
  { value: '4', label: '比较符合' },
  { value: '5', label: '非常符合' },
];
const ANX_OPTIONS = [
  { value: '1', label: '从不' },
  { value: '2', label: '有时' },
  { value: '3', label: '一般' },
  { value: '4', label: '经常' },
  { value: '5', label: '总是' },
];
const RES_OPTIONS = [
  { value: '1', label: '从不这样' },
  { value: '2', label: '很少这样' },
  { value: '3', label: '有时这样' },
  { value: '4', label: '经常这样' },
  { value: '5', label: '总是这样' },
];
const OPTION_SETS: Record<string, typeof COMM_OPTIONS> = {
  comm: COMM_OPTIONS,
  anx: ANX_OPTIONS,
  res: RES_OPTIONS,
};

const QINZI_QUESTIONS = [
  // ===== 亲子沟通情况（comm，12 题，满分 60，越高越好，第 4/8/9 题为反向题）=====
  { id: 'qz_comm_1', type: 'scale', title: '我允许孩子在一些事情上和我有不同意见', dimension: 'comm', required: true, scaleConfig: { min: 1, max: 5, minLabel: '完全不符合', maxLabel: '非常符合', type: 'number' } },
  { id: 'qz_comm_2', type: 'scale', title: '和孩子谈家庭规则或安排时，我会让孩子参与讨论', dimension: 'comm', required: true, scaleConfig: { min: 1, max: 5, minLabel: '完全不符合', maxLabel: '非常符合', type: 'number' } },
  { id: 'qz_comm_3', type: 'scale', title: '和孩子谈事情时，我会主动询问孩子的看法', dimension: 'comm', required: true, scaleConfig: { min: 1, max: 5, minLabel: '完全不符合', maxLabel: '非常符合', type: 'number' } },
  { id: 'qz_comm_4', type: 'scale', title: '和孩子讨论事情时，我常常坚持自己说了算', dimension: 'comm', required: true, reverse: true, scaleConfig: { min: 1, max: 5, minLabel: '完全不符合', maxLabel: '非常符合', type: 'number' } },
  { id: 'qz_comm_5', type: 'scale', title: '我鼓励孩子表达不同意见，并说明自己的理由', dimension: 'comm', required: true, scaleConfig: { min: 1, max: 5, minLabel: '完全不符合', maxLabel: '非常符合', type: 'number' } },
  { id: 'qz_comm_6', type: 'scale', title: '我会鼓励孩子从不同角度看问题', dimension: 'comm', required: true, scaleConfig: { min: 1, max: 5, minLabel: '完全不符合', maxLabel: '非常符合', type: 'number' } },
  { id: 'qz_comm_7', type: 'scale', title: '孩子愿意告诉我他在想什么', dimension: 'comm', required: true, scaleConfig: { min: 1, max: 5, minLabel: '完全不符合', maxLabel: '非常符合', type: 'number' } },
  { id: 'qz_comm_8', type: 'scale', title: '孩子不认同我的观点时，我通常会很生气', dimension: 'comm', required: true, reverse: true, scaleConfig: { min: 1, max: 5, minLabel: '完全不符合', maxLabel: '非常符合', type: 'number' } },
  { id: 'qz_comm_9', type: 'scale', title: '孩子做得不好时，我会先批评，而不是先了解原因和想法', dimension: 'comm', required: true, reverse: true, scaleConfig: { min: 1, max: 5, minLabel: '完全不符合', maxLabel: '非常符合', type: 'number' } },
  { id: 'qz_comm_10', type: 'scale', title: '我和孩子会谈论彼此的感受和情绪', dimension: 'comm', required: true, scaleConfig: { min: 1, max: 5, minLabel: '完全不符合', maxLabel: '非常符合', type: 'number' } },
  // 效度题（测谎项，插在亲子沟通第 11 题位置，期望作答 5，不计分）
  { id: 'qz_lie', type: 'scale', title: '为确保您在认真阅读每道题，本题请直接选择「非常符合」', dimension: 'comm', required: true, lie: true, scaleConfig: { min: 1, max: 5, minLabel: '完全不符合', maxLabel: '非常符合', type: 'number' } },
  { id: 'qz_comm_11', type: 'scale', title: '即使意见不一致，孩子也愿意和我讲话', dimension: 'comm', required: true, scaleConfig: { min: 1, max: 5, minLabel: '完全不符合', maxLabel: '非常符合', type: 'number' } },
  { id: 'qz_comm_12', type: 'scale', title: '即使不同意孩子的观点，我也愿意认真听他说完', dimension: 'comm', required: true, scaleConfig: { min: 1, max: 5, minLabel: '完全不符合', maxLabel: '非常符合', type: 'number' } },
  // ===== 学业焦虑（anx，12 题，满分 60，越高越差，无反向题）=====
  { id: 'qz_anx_1', type: 'scale', title: '孩子学习时经常心不在焉、注意力难以集中，让我感到苦恼', dimension: 'anx', required: true, scaleConfig: { min: 1, max: 5, minLabel: '从不', maxLabel: '总是', type: 'number' } },
  { id: 'qz_anx_2', type: 'scale', title: '我担心自己的能力不足，无法为孩子提供更好的教育支持', dimension: 'anx', required: true, scaleConfig: { min: 1, max: 5, minLabel: '从不', maxLabel: '总是', type: 'number' } },
  { id: 'qz_anx_3', type: 'scale', title: '想到自己无法为孩子提供更多或更好的教育资源，我会感到心烦', dimension: 'anx', required: true, scaleConfig: { min: 1, max: 5, minLabel: '从不', maxLabel: '总是', type: 'number' } },
  { id: 'qz_anx_4', type: 'scale', title: '孩子临近重要考试时，我比平时更容易紧张和焦躁', dimension: 'anx', required: true, scaleConfig: { min: 1, max: 5, minLabel: '从不', maxLabel: '总是', type: 'number' } },
  { id: 'qz_anx_5', type: 'scale', title: '孩子学习态度不够认真时，我会感到着急，甚至忍不住批评他', dimension: 'anx', required: true, scaleConfig: { min: 1, max: 5, minLabel: '从不', maxLabel: '总是', type: 'number' } },
  { id: 'qz_anx_6', type: 'scale', title: '孩子备考重要考试时，我会紧张得睡不好', dimension: 'anx', required: true, scaleConfig: { min: 1, max: 5, minLabel: '从不', maxLabel: '总是', type: 'number' } },
  { id: 'qz_anx_7', type: 'scale', title: '孩子考试没考好时，我会急得坐立不安', dimension: 'anx', required: true, scaleConfig: { min: 1, max: 5, minLabel: '从不', maxLabel: '总是', type: 'number' } },
  { id: 'qz_anx_8', type: 'scale', title: '孩子的教育费用支出较多时，我会感到经济负担较重', dimension: 'anx', required: true, scaleConfig: { min: 1, max: 5, minLabel: '从不', maxLabel: '总是', type: 'number' } },
  { id: 'qz_anx_9', type: 'scale', title: '孩子的作业或学习问题我辅导不来时，会感到无助', dimension: 'anx', required: true, scaleConfig: { min: 1, max: 5, minLabel: '从不', maxLabel: '总是', type: 'number' } },
  { id: 'qz_anx_10', type: 'scale', title: '想到孩子所在班级或学校的学习环境可能影响学习，我会感到烦心', dimension: 'anx', required: true, scaleConfig: { min: 1, max: 5, minLabel: '从不', maxLabel: '总是', type: 'number' } },
  { id: 'qz_anx_11', type: 'scale', title: '孩子做作业拖拉、经常不能按时完成时，我会感到着急', dimension: 'anx', required: true, scaleConfig: { min: 1, max: 5, minLabel: '从不', maxLabel: '总是', type: 'number' } },
  { id: 'qz_anx_12', type: 'scale', title: '想到如果没人监督孩子就不会主动学习，我会感到无助', dimension: 'anx', required: true, scaleConfig: { min: 1, max: 5, minLabel: '从不', maxLabel: '总是', type: 'number' } },
  // ===== 心理韧性（res，10 题，满分 50，越高越好，无反向题）=====
  { id: 'qz_res_1', type: 'scale', title: '当事情和以前不一样时，孩子通常能慢慢适应', dimension: 'res', required: true, scaleConfig: { min: 1, max: 5, minLabel: '从不这样', maxLabel: '总是这样', type: 'number' } },
  { id: 'qz_res_2', type: 'scale', title: '遇到不顺利或不好的事情时，孩子通常会尝试想办法应对', dimension: 'res', required: true, scaleConfig: { min: 1, max: 5, minLabel: '从不这样', maxLabel: '总是这样', type: 'number' } },
  { id: 'qz_res_3', type: 'scale', title: '遇到让人头疼的难题时，孩子能尝试让自己放松或心情好一些', dimension: 'res', required: true, scaleConfig: { min: 1, max: 5, minLabel: '从不这样', maxLabel: '总是这样', type: 'number' } },
  { id: 'qz_res_4', type: 'scale', title: '努力解决麻烦之后，孩子通常能从中获得经验或信心', dimension: 'res', required: true, scaleConfig: { min: 1, max: 5, minLabel: '从不这样', maxLabel: '总是这样', type: 'number' } },
  { id: 'qz_res_5', type: 'scale', title: '生病、受伤、受挫或难过之后，孩子通常能较快恢复', dimension: 'res', required: true, scaleConfig: { min: 1, max: 5, minLabel: '从不这样', maxLabel: '总是这样', type: 'number' } },
  { id: 'qz_res_6', type: 'scale', title: '即使过程有点困难，孩子通常仍相信自己可以完成或做好', dimension: 'res', required: true, scaleConfig: { min: 1, max: 5, minLabel: '从不这样', maxLabel: '总是这样', type: 'number' } },
  { id: 'qz_res_7', type: 'scale', title: '心里着急时，孩子仍能尽量专注，把事情想清楚', dimension: 'res', required: true, scaleConfig: { min: 1, max: 5, minLabel: '从不这样', maxLabel: '总是这样', type: 'number' } },
  { id: 'qz_res_8', type: 'scale', title: '即使一件事没做好，孩子也不容易马上放弃', dimension: 'res', required: true, scaleConfig: { min: 1, max: 5, minLabel: '从不这样', maxLabel: '总是这样', type: 'number' } },
  { id: 'qz_res_9', type: 'scale', title: '遇到困难和挑战时，孩子愿意面对或继续尝试', dimension: 'res', required: true, scaleConfig: { min: 1, max: 5, minLabel: '从不这样', maxLabel: '总是这样', type: 'number' } },
  { id: 'qz_res_10', type: 'scale', title: '当孩子伤心、害怕或想发脾气时，通常知道怎样让自己慢慢平静下来', dimension: 'res', required: true, scaleConfig: { min: 1, max: 5, minLabel: '从不这样', maxLabel: '总是这样', type: 'number' } },
];

// ===== 爱情三角测评（love，30 题三角 + 6 题依恋 = 36 题）=====
// 爱情三角（Sternberg TLS 改编）：亲密 intimacy / 激情 passion / 承诺 commitment，各 10 题
// 免费版取每维前 4 题（共 12 题，标记 free: true）；深度版 36 题全量
// 依恋（ECR 简版改编）：焦虑 3 题 + 回避 3 题，仅深度版出现
const LOVE_TRIANGLE_QUESTIONS = [
  // ===== 亲密 intimacy（4 题）=====
  { id: 'love_i_1', type: 'scale', title: '我能与伴侣分享内心深处的想法和感受', dimension: 'intimacy', required: true, options: [
    { value: '1', label: '完全不符合' }, { value: '2', label: '比较不符合' }, { value: '3', label: '一般' }, { value: '4', label: '比较符合' }, { value: '5', label: '非常符合' }
  ], scaleConfig: { min: 1, max: 5, minLabel: '非常不符合', maxLabel: '非常符合', type: 'number' } },
  { id: 'love_i_2', type: 'scale', title: '我与伴侣之间的关系非常亲密', dimension: 'intimacy', required: true, options: [
    { value: '1', label: '完全不符合' }, { value: '2', label: '比较不符合' }, { value: '3', label: '一般' }, { value: '4', label: '比较符合' }, { value: '5', label: '非常符合' }
  ], scaleConfig: { min: 1, max: 5, minLabel: '非常不符合', maxLabel: '非常符合', type: 'number' } },
  { id: 'love_i_3', type: 'scale', title: '伴侣理解并支持我的情感需求', dimension: 'intimacy', required: true, options: [
    { value: '1', label: '完全不符合' }, { value: '2', label: '比较不符合' }, { value: '3', label: '一般' }, { value: '4', label: '比较符合' }, { value: '5', label: '非常符合' }
  ], scaleConfig: { min: 1, max: 5, minLabel: '非常不符合', maxLabel: '非常符合', type: 'number' } },
  { id: 'love_i_4', type: 'scale', title: '我可以毫无保留地向伴侣倾诉烦恼', dimension: 'intimacy', required: true, options: [
    { value: '1', label: '完全不符合' }, { value: '2', label: '比较不符合' }, { value: '3', label: '一般' }, { value: '4', label: '比较符合' }, { value: '5', label: '非常符合' }
  ], scaleConfig: { min: 1, max: 5, minLabel: '非常不符合', maxLabel: '非常符合', type: 'number' } },
  // ===== 激情 passion（4 题）=====
  { id: 'love_p_1', type: 'scale', title: '只要想到伴侣，我就会感到兴奋和心跳加速', dimension: 'passion', required: true, options: [
    { value: '1', label: '完全不符合' }, { value: '2', label: '比较不符合' }, { value: '3', label: '一般' }, { value: '4', label: '比较符合' }, { value: '5', label: '非常符合' }
  ], scaleConfig: { min: 1, max: 5, minLabel: '非常不符合', maxLabel: '非常符合', type: 'number' } },
  { id: 'love_p_2', type: 'scale', title: '与伴侣在一起时，我常常感到激情澎湃', dimension: 'passion', required: true, options: [
    { value: '1', label: '完全不符合' }, { value: '2', label: '比较不符合' }, { value: '3', label: '一般' }, { value: '4', label: '比较符合' }, { value: '5', label: '非常符合' }
  ], scaleConfig: { min: 1, max: 5, minLabel: '非常不符合', maxLabel: '非常符合', type: 'number' } },
  { id: 'love_p_3', type: 'scale', title: '我被伴侣深深吸引，难以抗拒', dimension: 'passion', required: true, options: [
    { value: '1', label: '完全不符合' }, { value: '2', label: '比较不符合' }, { value: '3', label: '一般' }, { value: '4', label: '比较符合' }, { value: '5', label: '非常符合' }
  ], scaleConfig: { min: 1, max: 5, minLabel: '非常不符合', maxLabel: '非常符合', type: 'number' } },
  { id: 'love_p_4', type: 'scale', title: '我渴望与伴侣有亲密的身体接触', dimension: 'passion', required: true, options: [
    { value: '1', label: '完全不符合' }, { value: '2', label: '比较不符合' }, { value: '3', label: '一般' }, { value: '4', label: '比较符合' }, { value: '5', label: '非常符合' }
  ], scaleConfig: { min: 1, max: 5, minLabel: '非常不符合', maxLabel: '非常符合', type: 'number' } },
  // ===== 承诺 commitment（4 题）=====
  { id: 'love_c_1', type: 'scale', title: '我决定与伴侣共同走过一生', dimension: 'commitment', required: true, options: [
    { value: '1', label: '完全不符合' }, { value: '2', label: '比较不符合' }, { value: '3', label: '一般' }, { value: '4', label: '比较符合' }, { value: '5', label: '非常符合' }
  ], scaleConfig: { min: 1, max: 5, minLabel: '非常不符合', maxLabel: '非常符合', type: 'number' } },
  { id: 'love_c_2', type: 'scale', title: '我愿意为维护这段关系承担责任', dimension: 'commitment', required: true, options: [
    { value: '1', label: '完全不符合' }, { value: '2', label: '比较不符合' }, { value: '3', label: '一般' }, { value: '4', label: '比较符合' }, { value: '5', label: '非常符合' }
  ], scaleConfig: { min: 1, max: 5, minLabel: '非常不符合', maxLabel: '非常符合', type: 'number' } },
  { id: 'love_c_3', type: 'scale', title: '即使遇到困难，我也愿意坚持这段关系', dimension: 'commitment', required: true, options: [
    { value: '1', label: '完全不符合' }, { value: '2', label: '比较不符合' }, { value: '3', label: '一般' }, { value: '4', label: '比较符合' }, { value: '5', label: '非常符合' }
  ], scaleConfig: { min: 1, max: 5, minLabel: '非常不符合', maxLabel: '非常符合', type: 'number' } },
  { id: 'love_c_4', type: 'scale', title: '我对这段关系的未来充满信心', dimension: 'commitment', required: true, options: [
    { value: '1', label: '完全不符合' }, { value: '2', label: '比较不符合' }, { value: '3', label: '一般' }, { value: '4', label: '比较符合' }, { value: '5', label: '非常符合' }
  ], scaleConfig: { min: 1, max: 5, minLabel: '非常不符合', maxLabel: '非常符合', type: 'number' } },
];

const LOVE_QUESTIONS = LOVE_TRIANGLE_QUESTIONS;

// ===== 爱情态度量表 LAS（42 题，6 维度：eros/ludus/storge/pragma/mania/agape）=====
// 计分归属已按参考量表修正：Eros 含第 33 题；Ludus 含第 37 题
const LAS_QUESTIONS = [
  // ===== 浪漫型 eros（7 题）=====
  { id: 'las_q1', type: 'scale', title: '我和他/她属于一见钟情型。', dimension: 'eros', required: true, scaleConfig: { min: 1, max: 5, minLabel: '非常不同意', maxLabel: '非常同意', type: 'number' } },
  { id: 'las_q11', type: 'scale', title: '我和他/她很来电。', dimension: 'eros', required: true, scaleConfig: { min: 1, max: 5, minLabel: '非常不同意', maxLabel: '非常同意', type: 'number' } },
  { id: 'las_q15', type: 'scale', title: '我和他/她的亲密行为是很热情且很令我满意。', dimension: 'eros', required: true, scaleConfig: { min: 1, max: 5, minLabel: '非常不同意', maxLabel: '非常同意', type: 'number' } },
  { id: 'las_q22', type: 'scale', title: '我觉得我和他/她是天生一对。', dimension: 'eros', required: true, scaleConfig: { min: 1, max: 5, minLabel: '非常不同意', maxLabel: '非常同意', type: 'number' } },
  { id: 'las_q27', type: 'scale', title: '我和他/她的感情、亲密行为进展得很快。', dimension: 'eros', required: true, scaleConfig: { min: 1, max: 5, minLabel: '非常不同意', maxLabel: '非常同意', type: 'number' } },
  { id: 'las_q33', type: 'scale', title: '我和他/她非常了解彼此。', dimension: 'eros', required: true, scaleConfig: { min: 1, max: 5, minLabel: '非常不同意', maxLabel: '非常同意', type: 'number' } },
  { id: 'las_q36', type: 'scale', title: '他/她的外貌符合我的理想标准。', dimension: 'eros', required: true, scaleConfig: { min: 1, max: 5, minLabel: '非常不同意', maxLabel: '非常同意', type: 'number' } },
  // ===== 同伴型 storge（7 题）=====
  { id: 'las_q2', type: 'scale', title: '我很难明确地说我和他/她是何时从友情变成爱情的。', dimension: 'storge', required: true, scaleConfig: { min: 1, max: 5, minLabel: '非常不同意', maxLabel: '非常同意', type: 'number' } },
  { id: 'las_q12', type: 'scale', title: '我需要先经过一阵子的关心和照顾，才有可能产生爱情。', dimension: 'storge', required: true, scaleConfig: { min: 1, max: 5, minLabel: '非常不同意', maxLabel: '非常同意', type: 'number' } },
  { id: 'las_q19', type: 'scale', title: '我希望和曾经相爱的他/她是永远的朋友。', dimension: 'storge', required: true, scaleConfig: { min: 1, max: 5, minLabel: '非常不同意', maxLabel: '非常同意', type: 'number' } },
  { id: 'las_q21', type: 'scale', title: '我和他/她的爱情关系是最理想的，因为是由长久的友谊发展而成的。', dimension: 'storge', required: true, scaleConfig: { min: 1, max: 5, minLabel: '非常不同意', maxLabel: '非常同意', type: 'number' } },
  { id: 'las_q28', type: 'scale', title: '我和他/她的友情随着时间逐渐转变为爱情。', dimension: 'storge', required: true, scaleConfig: { min: 1, max: 5, minLabel: '非常不同意', maxLabel: '非常同意', type: 'number' } },
  { id: 'las_q31', type: 'scale', title: '我和他/她的爱情是一种深刻的友情，而不是一种很神秘的情感。', dimension: 'storge', required: true, scaleConfig: { min: 1, max: 5, minLabel: '非常不同意', maxLabel: '非常同意', type: 'number' } },
  { id: 'las_q42', type: 'scale', title: '我和他/她的爱情关系是最令人满意的，因为是由良好友情发展成的。', dimension: 'storge', required: true, scaleConfig: { min: 1, max: 5, minLabel: '非常不同意', maxLabel: '非常同意', type: 'number' } },
  // ===== 现实型 pragma（7 题）=====
  { id: 'las_q3', type: 'scale', title: '对他/她做承诺之前，我会考虑他/她将来可能变成的样子。', dimension: 'pragma', required: true, scaleConfig: { min: 1, max: 5, minLabel: '非常不同意', maxLabel: '非常同意', type: 'number' } },
  { id: 'las_q7', type: 'scale', title: '在选择他/她之前，我会先试着仔细规划我的人生。', dimension: 'pragma', required: true, scaleConfig: { min: 1, max: 5, minLabel: '非常不同意', maxLabel: '非常同意', type: 'number' } },
  { id: 'las_q13', type: 'scale', title: '我和他/她最好有相似的背景。', dimension: 'pragma', required: true, scaleConfig: { min: 1, max: 5, minLabel: '非常不同意', maxLabel: '非常同意', type: 'number' } },
  { id: 'las_q18', type: 'scale', title: '他/她如何看待我的家人是我选择他/她的主要考量。', dimension: 'pragma', required: true, scaleConfig: { min: 1, max: 5, minLabel: '非常不同意', maxLabel: '非常同意', type: 'number' } },
  { id: 'las_q24', type: 'scale', title: '他/她将来会不会是一个好父亲/母亲是我选择他/她的一个重要因素。', dimension: 'pragma', required: true, scaleConfig: { min: 1, max: 5, minLabel: '非常不同意', maxLabel: '非常同意', type: 'number' } },
  { id: 'las_q35', type: 'scale', title: '他/她如何看待我的职业会是我选择他/她的一个考量。', dimension: 'pragma', required: true, scaleConfig: { min: 1, max: 5, minLabel: '非常不同意', maxLabel: '非常同意', type: 'number' } },
  { id: 'las_q39', type: 'scale', title: '在和他/她深入交往之前，我会试着了解他/她是否有良好的遗传基因。', dimension: 'pragma', required: true, scaleConfig: { min: 1, max: 5, minLabel: '非常不同意', maxLabel: '非常同意', type: 'number' } },
  // ===== 奉献型 agape（7 题）=====
  { id: 'las_q4', type: 'scale', title: '我总是试着帮他/她渡过难关。', dimension: 'agape', required: true, scaleConfig: { min: 1, max: 5, minLabel: '非常不同意', maxLabel: '非常同意', type: 'number' } },
  { id: 'las_q8', type: 'scale', title: '我宁愿自己痛苦，也不愿意让他/她受苦。', dimension: 'agape', required: true, scaleConfig: { min: 1, max: 5, minLabel: '非常不同意', maxLabel: '非常同意', type: 'number' } },
  { id: 'las_q25', type: 'scale', title: '除非我先让他/她快乐，否则我不会感到快乐。', dimension: 'agape', required: true, scaleConfig: { min: 1, max: 5, minLabel: '非常不同意', maxLabel: '非常同意', type: 'number' } },
  { id: 'las_q30', type: 'scale', title: '我通常愿意牺牲自己的愿望，达成他/她的愿望。', dimension: 'agape', required: true, scaleConfig: { min: 1, max: 5, minLabel: '非常不同意', maxLabel: '非常同意', type: 'number' } },
  { id: 'las_q32', type: 'scale', title: '他/她可以任意使用我的东西。', dimension: 'agape', required: true, scaleConfig: { min: 1, max: 5, minLabel: '非常不同意', maxLabel: '非常同意', type: 'number' } },
  { id: 'las_q38', type: 'scale', title: '当他/她对我发脾气时，我仍然全心全意、无条件地爱他/她。', dimension: 'agape', required: true, scaleConfig: { min: 1, max: 5, minLabel: '非常不同意', maxLabel: '非常同意', type: 'number' } },
  { id: 'las_q40', type: 'scale', title: '为了他/她，我愿意忍受任何事情。', dimension: 'agape', required: true, scaleConfig: { min: 1, max: 5, minLabel: '非常不同意', maxLabel: '非常同意', type: 'number' } },
  // ===== 占有型 mania（7 题）=====
  { id: 'las_q5', type: 'scale', title: '和他/她的关系不太对劲时，我的身体就会不舒服。', dimension: 'mania', required: true, scaleConfig: { min: 1, max: 5, minLabel: '非常不同意', maxLabel: '非常同意', type: 'number' } },
  { id: 'las_q9', type: 'scale', title: '失恋时，我会十分沮丧，甚至会有自杀的念头。', dimension: 'mania', required: true, scaleConfig: { min: 1, max: 5, minLabel: '非常不同意', maxLabel: '非常同意', type: 'number' } },
  { id: 'las_q16', type: 'scale', title: '我有时会因为想到自己正在谈恋爱而兴奋地睡不着觉。', dimension: 'mania', required: true, scaleConfig: { min: 1, max: 5, minLabel: '非常不同意', maxLabel: '非常同意', type: 'number' } },
  { id: 'las_q20', type: 'scale', title: '当他/她不注意我时，我会全身不舒服。', dimension: 'mania', required: true, scaleConfig: { min: 1, max: 5, minLabel: '非常不同意', maxLabel: '非常同意', type: 'number' } },
  { id: 'las_q23', type: 'scale', title: '自从和他/她谈恋爱后，我很难专心在其他任何事情上。', dimension: 'mania', required: true, scaleConfig: { min: 1, max: 5, minLabel: '非常不同意', maxLabel: '非常同意', type: 'number' } },
  { id: 'las_q34', type: 'scale', title: '当我怀疑他/她和其他人在一起时，我就无法放松。', dimension: 'mania', required: true, scaleConfig: { min: 1, max: 5, minLabel: '非常不同意', maxLabel: '非常同意', type: 'number' } },
  { id: 'las_q41', type: 'scale', title: '如果他/她忽略我一阵子，我会做出一些傻事来吸引他/她的注意力。', dimension: 'mania', required: true, scaleConfig: { min: 1, max: 5, minLabel: '非常不同意', maxLabel: '非常同意', type: 'number' } },
  // ===== 游戏型 ludus（7 题）=====
  { id: 'las_q6', type: 'scale', title: '我试着不给他/她明确的承诺。', dimension: 'ludus', required: true, scaleConfig: { min: 1, max: 5, minLabel: '非常不同意', maxLabel: '非常同意', type: 'number' } },
  { id: 'las_q10', type: 'scale', title: '我相信他/她不知道我的一些事，也不会受到伤害。', dimension: 'ludus', required: true, scaleConfig: { min: 1, max: 5, minLabel: '非常不同意', maxLabel: '非常同意', type: 'number' } },
  { id: 'las_q14', type: 'scale', title: '有时候，我得防范他/她发现我还有其他情人。', dimension: 'ludus', required: true, scaleConfig: { min: 1, max: 5, minLabel: '非常不同意', maxLabel: '非常同意', type: 'number' } },
  { id: 'las_q17', type: 'scale', title: '我可以很容易、很快地忘掉过往的恋情。', dimension: 'ludus', required: true, scaleConfig: { min: 1, max: 5, minLabel: '非常不同意', maxLabel: '非常同意', type: 'number' } },
  { id: 'las_q26', type: 'scale', title: '如果他/她知道我和其他人做了某些事，他/她会不高兴。', dimension: 'ludus', required: true, scaleConfig: { min: 1, max: 5, minLabel: '非常不同意', maxLabel: '非常同意', type: 'number' } },
  { id: 'las_q29', type: 'scale', title: '当他/她太依赖我时，我会想和他/她疏远一些。', dimension: 'ludus', required: true, scaleConfig: { min: 1, max: 5, minLabel: '非常不同意', maxLabel: '非常同意', type: 'number' } },
  { id: 'las_q37', type: 'scale', title: '我享受和他/她及一些不同的情人玩爱情游戏。', dimension: 'ludus', required: true, scaleConfig: { min: 1, max: 5, minLabel: '非常不同意', maxLabel: '非常同意', type: 'number' } },
];

const HOLLAND_QUESTIONS = [
  { id: 'hol_1', type: 'scale', title: '我喜欢动手修理或制作物品', dimension: 'R', required: true, scaleConfig: { min: 1, max: 5, minLabel: '非常不喜欢', maxLabel: '非常喜欢', type: 'star' } },
  { id: 'hol_2', type: 'scale', title: '我喜欢户外活动或体育运动', dimension: 'R', required: true, scaleConfig: { min: 1, max: 5, minLabel: '非常不喜欢', maxLabel: '非常喜欢', type: 'star' } },
  { id: 'hol_3', type: 'scale', title: '我擅长操作机器或工具', dimension: 'R', required: true, scaleConfig: { min: 1, max: 5, minLabel: '非常不喜欢', maxLabel: '非常喜欢', type: 'star' } },
  { id: 'hol_4', type: 'scale', title: '我喜欢做科学实验或研究', dimension: 'I', required: true, scaleConfig: { min: 1, max: 5, minLabel: '非常不喜欢', maxLabel: '非常喜欢', type: 'star' } },
  { id: 'hol_5', type: 'scale', title: '我喜欢解决复杂的问题', dimension: 'I', required: true, scaleConfig: { min: 1, max: 5, minLabel: '非常不喜欢', maxLabel: '非常喜欢', type: 'star' } },
  { id: 'hol_6', type: 'scale', title: '我对数学和逻辑推理感兴趣', dimension: 'I', required: true, scaleConfig: { min: 1, max: 5, minLabel: '非常不喜欢', maxLabel: '非常喜欢', type: 'star' } },
  { id: 'hol_7', type: 'scale', title: '我喜欢绘画、音乐或写作', dimension: 'A', required: true, scaleConfig: { min: 1, max: 5, minLabel: '非常不喜欢', maxLabel: '非常喜欢', type: 'star' } },
  { id: 'hol_8', type: 'scale', title: '我富有想象力和创造力', dimension: 'A', required: true, scaleConfig: { min: 1, max: 5, minLabel: '非常不喜欢', maxLabel: '非常喜欢', type: 'star' } },
  { id: 'hol_9', type: 'scale', title: '我欣赏独特的艺术表达', dimension: 'A', required: true, scaleConfig: { min: 1, max: 5, minLabel: '非常不喜欢', maxLabel: '非常喜欢', type: 'star' } },
  { id: 'hol_10', type: 'scale', title: '我喜欢帮助和教导他人', dimension: 'S', required: true, scaleConfig: { min: 1, max: 5, minLabel: '非常不喜欢', maxLabel: '非常喜欢', type: 'star' } },
  { id: 'hol_11', type: 'scale', title: '我关心他人的感受和需求', dimension: 'S', required: true, scaleConfig: { min: 1, max: 5, minLabel: '非常不喜欢', maxLabel: '非常喜欢', type: 'star' } },
  { id: 'hol_12', type: 'scale', title: '我乐于参与志愿服务或社区活动', dimension: 'S', required: true, scaleConfig: { min: 1, max: 5, minLabel: '非常不喜欢', maxLabel: '非常喜欢', type: 'star' } },
  { id: 'hol_13', type: 'scale', title: '我喜欢领导和管理他人', dimension: 'E', required: true, scaleConfig: { min: 1, max: 5, minLabel: '非常不喜欢', maxLabel: '非常喜欢', type: 'star' } },
  { id: 'hol_14', type: 'scale', title: '我对商业和创业感兴趣', dimension: 'E', required: true, scaleConfig: { min: 1, max: 5, minLabel: '非常不喜欢', maxLabel: '非常喜欢', type: 'star' } },
  { id: 'hol_15', type: 'scale', title: '我擅长说服和影响他人', dimension: 'E', required: true, scaleConfig: { min: 1, max: 5, minLabel: '非常不喜欢', maxLabel: '非常喜欢', type: 'star' } },
  { id: 'hol_16', type: 'scale', title: '我喜欢有条理和规范的工作', dimension: 'C', required: true, scaleConfig: { min: 1, max: 5, minLabel: '非常不喜欢', maxLabel: '非常喜欢', type: 'star' } },
  { id: 'hol_17', type: 'scale', title: '我善于整理和管理数据', dimension: 'C', required: true, scaleConfig: { min: 1, max: 5, minLabel: '非常不喜欢', maxLabel: '非常喜欢', type: 'star' } },
  { id: 'hol_18', type: 'scale', title: '我注重工作的准确性和规范性', dimension: 'C', required: true, scaleConfig: { min: 1, max: 5, minLabel: '非常不喜欢', maxLabel: '非常喜欢', type: 'star' } },
];

const BIGFIVE_QUESTIONS = [
  { id: 'bf_1', type: 'scale', title: '我喜欢尝试新鲜事物和独特的体验', dimension: 'O', required: true, scaleConfig: { min: 1, max: 5, minLabel: '非常不符合', maxLabel: '非常符合', type: 'number' } },
  { id: 'bf_2', type: 'scale', title: '我对抽象概念和哲学问题感兴趣', dimension: 'O', required: true, scaleConfig: { min: 1, max: 5, minLabel: '非常不符合', maxLabel: '非常符合', type: 'number' } },
  { id: 'bf_3', type: 'scale', title: '我富有想象力，经常产生新点子', dimension: 'O', required: true, scaleConfig: { min: 1, max: 5, minLabel: '非常不符合', maxLabel: '非常符合', type: 'number' } },
  { id: 'bf_4', type: 'scale', title: '我欣赏艺术、音乐和文学作品', dimension: 'O', required: true, scaleConfig: { min: 1, max: 5, minLabel: '非常不符合', maxLabel: '非常符合', type: 'number' } },
  { id: 'bf_5', type: 'scale', title: '我做事有条理，喜欢按计划执行', dimension: 'C', required: true, scaleConfig: { min: 1, max: 5, minLabel: '非常不符合', maxLabel: '非常符合', type: 'number' } },
  { id: 'bf_6', type: 'scale', title: '我注重细节，力求把事情做对', dimension: 'C', required: true, scaleConfig: { min: 1, max: 5, minLabel: '非常不符合', maxLabel: '非常符合', type: 'number' } },
  { id: 'bf_7', type: 'scale', title: '我能够自律地完成任务', dimension: 'C', required: true, scaleConfig: { min: 1, max: 5, minLabel: '非常不符合', maxLabel: '非常符合', type: 'number' } },
  { id: 'bf_8', type: 'scale', title: '我经常提前做好准备，避免临时抱佛脚', dimension: 'C', required: true, scaleConfig: { min: 1, max: 5, minLabel: '非常不符合', maxLabel: '非常符合', type: 'number' } },
  { id: 'bf_9', type: 'scale', title: '我在社交场合中感到精力充沛', dimension: 'E', required: true, scaleConfig: { min: 1, max: 5, minLabel: '非常不符合', maxLabel: '非常符合', type: 'number' } },
  { id: 'bf_10', type: 'scale', title: '我喜欢主动与他人交谈', dimension: 'E', required: true, scaleConfig: { min: 1, max: 5, minLabel: '非常不符合', maxLabel: '非常符合', type: 'number' } },
  { id: 'bf_11', type: 'scale', title: '我倾向于成为聚会的焦点', dimension: 'E', required: true, scaleConfig: { min: 1, max: 5, minLabel: '非常不符合', maxLabel: '非常符合', type: 'number' } },
  { id: 'bf_12', type: 'scale', title: '我善于在人群中表达自己', dimension: 'E', required: true, scaleConfig: { min: 1, max: 5, minLabel: '非常不符合', maxLabel: '非常符合', type: 'number' } },
  { id: 'bf_13', type: 'scale', title: '我关心他人的感受，愿意提供帮助', dimension: 'A', required: true, scaleConfig: { min: 1, max: 5, minLabel: '非常不符合', maxLabel: '非常符合', type: 'number' } },
  { id: 'bf_14', type: 'scale', title: '我容易信任他人，相信别人的好意', dimension: 'A', required: true, scaleConfig: { min: 1, max: 5, minLabel: '非常不符合', maxLabel: '非常符合', type: 'number' } },
  { id: 'bf_15', type: 'scale', title: '我尽量避免与人发生冲突', dimension: 'A', required: true, scaleConfig: { min: 1, max: 5, minLabel: '非常不符合', maxLabel: '非常符合', type: 'number' } },
  { id: 'bf_16', type: 'scale', title: '我愿意妥协，以维护和谐关系', dimension: 'A', required: true, scaleConfig: { min: 1, max: 5, minLabel: '非常不符合', maxLabel: '非常符合', type: 'number' } },
  { id: 'bf_17', type: 'scale', title: '我容易感到焦虑或紧张', dimension: 'N', required: true, scaleConfig: { min: 1, max: 5, minLabel: '非常不符合', maxLabel: '非常符合', type: 'number' } },
  { id: 'bf_18', type: 'scale', title: '我的情绪容易波动', dimension: 'N', required: true, scaleConfig: { min: 1, max: 5, minLabel: '非常不符合', maxLabel: '非常符合', type: 'number' } },
  { id: 'bf_19', type: 'scale', title: '面对压力时，我常常感到不安', dimension: 'N', required: true, scaleConfig: { min: 1, max: 5, minLabel: '非常不符合', maxLabel: '非常符合', type: 'number' } },
  { id: 'bf_20', type: 'scale', title: '我容易因为小事而烦恼', dimension: 'N', required: true, scaleConfig: { min: 1, max: 5, minLabel: '非常不符合', maxLabel: '非常符合', type: 'number' } },
];

const COLOR_QUESTIONS = [
  { id: 'color_1', type: 'scale', title: '我喜欢成为人群关注的焦点', dimension: '红', required: true, scaleConfig: { min: 1, max: 5, minLabel: '非常不符合', maxLabel: '非常符合', type: 'number' } },
  { id: 'color_2', type: 'scale', title: '我表达直接，不拐弯抹角', dimension: '红', required: true, scaleConfig: { min: 1, max: 5, minLabel: '非常不符合', maxLabel: '非常符合', type: 'number' } },
  { id: 'color_3', type: 'scale', title: '我乐观开朗，喜欢带动气氛', dimension: '红', required: true, scaleConfig: { min: 1, max: 5, minLabel: '非常不符合', maxLabel: '非常符合', type: 'number' } },
  { id: 'color_4', type: 'scale', title: '我行动迅速，想到就做', dimension: '红', required: true, scaleConfig: { min: 1, max: 5, minLabel: '非常不符合', maxLabel: '非常符合', type: 'number' } },
  { id: 'color_5', type: 'scale', title: '我注重细节，追求完美', dimension: '蓝', required: true, scaleConfig: { min: 1, max: 5, minLabel: '非常不符合', maxLabel: '非常符合', type: 'number' } },
  { id: 'color_6', type: 'scale', title: '我情绪敏感，容易受他人影响', dimension: '蓝', required: true, scaleConfig: { min: 1, max: 5, minLabel: '非常不符合', maxLabel: '非常符合', type: 'number' } },
  { id: 'color_7', type: 'scale', title: '我做事谨慎，喜欢深思熟虑', dimension: '蓝', required: true, scaleConfig: { min: 1, max: 5, minLabel: '非常不符合', maxLabel: '非常符合', type: 'number' } },
  { id: 'color_8', type: 'scale', title: '我重视规则和秩序', dimension: '蓝', required: true, scaleConfig: { min: 1, max: 5, minLabel: '非常不符合', maxLabel: '非常符合', type: 'number' } },
  { id: 'color_9', type: 'scale', title: '我目标明确，追求结果', dimension: '黄', required: true, scaleConfig: { min: 1, max: 5, minLabel: '非常不符合', maxLabel: '非常符合', type: 'number' } },
  { id: 'color_10', type: 'scale', title: '我喜欢掌控局面，做决策果断', dimension: '黄', required: true, scaleConfig: { min: 1, max: 5, minLabel: '非常不符合', maxLabel: '非常符合', type: 'number' } },
  { id: 'color_11', type: 'scale', title: '我竞争意识强，渴望成功', dimension: '黄', required: true, scaleConfig: { min: 1, max: 5, minLabel: '非常不符合', maxLabel: '非常符合', type: 'number' } },
  { id: 'color_12', type: 'scale', title: '我善于发现问题并推动改变', dimension: '黄', required: true, scaleConfig: { min: 1, max: 5, minLabel: '非常不符合', maxLabel: '非常符合', type: 'number' } },
  { id: 'color_13', type: 'scale', title: '我性格随和，不喜欢与人争执', dimension: '绿', required: true, scaleConfig: { min: 1, max: 5, minLabel: '非常不符合', maxLabel: '非常符合', type: 'number' } },
  { id: 'color_14', type: 'scale', title: '我耐心倾听，愿意支持他人', dimension: '绿', required: true, scaleConfig: { min: 1, max: 5, minLabel: '非常不符合', maxLabel: '非常符合', type: 'number' } },
  { id: 'color_15', type: 'scale', title: '我追求稳定，避免剧烈变化', dimension: '绿', required: true, scaleConfig: { min: 1, max: 5, minLabel: '非常不符合', maxLabel: '非常符合', type: 'number' } },
  { id: 'color_16', type: 'scale', title: '我容易满足，不苛求自己和他人', dimension: '绿', required: true, scaleConfig: { min: 1, max: 5, minLabel: '非常不符合', maxLabel: '非常符合', type: 'number' } },
];

const SBTI_QUESTIONS = [
  { id: 'sbti_1', type: 'scale', title: '我善于制定长期目标并规划路径', dimension: '战略', required: true, scaleConfig: { min: 1, max: 5, minLabel: '非常不符合', maxLabel: '非常符合', type: 'number' } },
  { id: 'sbti_2', type: 'scale', title: '我习惯从整体视角分析问题', dimension: '战略', required: true, scaleConfig: { min: 1, max: 5, minLabel: '非常不符合', maxLabel: '非常符合', type: 'number' } },
  { id: 'sbti_3', type: 'scale', title: '我能够预见风险并提前布局', dimension: '战略', required: true, scaleConfig: { min: 1, max: 5, minLabel: '非常不符合', maxLabel: '非常符合', type: 'number' } },
  { id: 'sbti_4', type: 'scale', title: '我喜欢研究趋势和数据', dimension: '战略', required: true, scaleConfig: { min: 1, max: 5, minLabel: '非常不符合', maxLabel: '非常符合', type: 'number' } },
  { id: 'sbti_5', type: 'scale', title: '我擅长协调不同意见，找到折中方案', dimension: '平衡', required: true, scaleConfig: { min: 1, max: 5, minLabel: '非常不符合', maxLabel: '非常符合', type: 'number' } },
  { id: 'sbti_6', type: 'scale', title: '我重视资源分配与效率', dimension: '平衡', required: true, scaleConfig: { min: 1, max: 5, minLabel: '非常不符合', maxLabel: '非常符合', type: 'number' } },
  { id: 'sbti_7', type: 'scale', title: '我能够在冲突中保持中立', dimension: '平衡', required: true, scaleConfig: { min: 1, max: 5, minLabel: '非常不符合', maxLabel: '非常符合', type: 'number' } },
  { id: 'sbti_8', type: 'scale', title: '我善于控制节奏，避免走极端', dimension: '平衡', required: true, scaleConfig: { min: 1, max: 5, minLabel: '非常不符合', maxLabel: '非常符合', type: 'number' } },
  { id: 'sbti_9', type: 'scale', title: '我喜欢与他人密切合作', dimension: '团队', required: true, scaleConfig: { min: 1, max: 5, minLabel: '非常不符合', maxLabel: '非常符合', type: 'number' } },
  { id: 'sbti_10', type: 'scale', title: '我重视团队氛围和成员感受', dimension: '团队', required: true, scaleConfig: { min: 1, max: 5, minLabel: '非常不符合', maxLabel: '非常符合', type: 'number' } },
  { id: 'sbti_11', type: 'scale', title: '我乐于分享信息，帮助他人', dimension: '团队', required: true, scaleConfig: { min: 1, max: 5, minLabel: '非常不符合', maxLabel: '非常符合', type: 'number' } },
  { id: 'sbti_12', type: 'scale', title: '我倾向于通过讨论达成共识', dimension: '团队', required: true, scaleConfig: { min: 1, max: 5, minLabel: '非常不符合', maxLabel: '非常符合', type: 'number' } },
  { id: 'sbti_13', type: 'scale', title: '我经常提出与众不同的想法', dimension: '创新', required: true, scaleConfig: { min: 1, max: 5, minLabel: '非常不符合', maxLabel: '非常符合', type: 'number' } },
  { id: 'sbti_14', type: 'scale', title: '我喜欢尝试新方法解决问题', dimension: '创新', required: true, scaleConfig: { min: 1, max: 5, minLabel: '非常不符合', maxLabel: '非常符合', type: 'number' } },
  { id: 'sbti_15', type: 'scale', title: '我对新技术和新工具充满好奇', dimension: '创新', required: true, scaleConfig: { min: 1, max: 5, minLabel: '非常不符合', maxLabel: '非常符合', type: 'number' } },
  { id: 'sbti_16', type: 'scale', title: '我善于打破常规，寻找突破口', dimension: '创新', required: true, scaleConfig: { min: 1, max: 5, minLabel: '非常不符合', maxLabel: '非常符合', type: 'number' } },
];

// ==================== 主函数 ====================

const ASSESSMENTS: any[] = [
  {
    id: 11,
    code: 'mbti', name: 'MBTI 性格类型测评', nameEn: 'MBTI Personality Test', category: '性格测评',
    description: '基于荣格心理类型理论，通过24道精选题目全面定位您的性格类型，揭示您的能量来源、信息获取、决策方式与生活方式偏好。',
    instructions: '本测评共 24 题，每题两个选项，请选择更符合您日常状态的一项。没有对错之分，凭第一反应作答即可。',
    coverColor: '#6366F1', icon: 'compass',
    questions: MBTI_QUESTIONS,
    dimensions: [{ code: 'EI', label: '能量来源', desc: '外向(E) vs 内向(I)' }, { code: 'SN', label: '信息获取', desc: '实感(S) vs 直觉(N)' }, { code: 'TF', label: '决策方式', desc: '思考(T) vs 情感(F)' }, { code: 'JP', label: '生活方式', desc: '判断(J) vs 知觉(P)' }],
    reportTemplates: { code: 'mbti', dimensionLabels: DIMENSION_LABELS.mbti, templates: MBTI_TEMPLATES },
    sortOrder: 1,
  },
  {
    id: 12,
    code: 'bigfive', name: '大五人格测评', nameEn: 'Big Five Personality Test', category: '性格测评',
    description: '基于心理学界公认的"大五人格模型"（OCEAN），从开放性、尽责性、外向性、宜人性、神经质五个维度全面刻画您的性格画像。',
    instructions: '本测评共 20 题，每题按 1-5 分打分，请根据您的真实情况选择最符合的程度。',
    coverColor: '#0EA5E9', icon: 'layers',
    questions: BIGFIVE_QUESTIONS,
    dimensions: [{ code: 'O', label: '开放性', desc: '好奇心与创造力' }, { code: 'C', label: '尽责性', desc: '自律与条理' }, { code: 'E', label: '外向性', desc: '社交与活力' }, { code: 'A', label: '宜人性', desc: '友善与协作' }, { code: 'N', label: '神经质', desc: '情绪敏感性' }],
    reportTemplates: { code: 'bigfive', dimensionLabels: DIMENSION_LABELS.bigfive, templates: BIGFIVE_TEMPLATES },
    sortOrder: 2,
  },
  {
    id: 13,
    code: 'disc', name: 'DISC 行为风格测评', nameEn: 'DISC Behavior Assessment', category: '性格测评',
    description: '经典的行为风格测评，从支配(D)、影响(I)、稳健(S)、谨慎(C)四个维度，帮助您了解自己在工作与生活中的行为倾向。',
    instructions: '本测评共 16 题，每题按 1-5 分打分，请根据您的真实表现作答。',
    coverColor: '#F59E0B', icon: 'zap',
    questions: DISC_QUESTIONS,
    dimensions: [{ code: 'D', label: '支配型', desc: '目标导向，果断强势' }, { code: 'I', label: '影响型', desc: '热情外向，善于交际' }, { code: 'S', label: '稳健型', desc: '耐心温和，重视稳定' }, { code: 'C', label: '谨慎型', desc: '严谨细致，追求精准' }],
    reportTemplates: { code: 'disc', dimensionLabels: DIMENSION_LABELS.disc, templates: DISC_TEMPLATES },
    sortOrder: 3,
  },
  {
    id: 14,
    code: 'color', name: '性格色彩测评', nameEn: 'FPA Personality Color', category: '性格测评',
    description: '乐嘉性格色彩学（FPA），将性格分为红、蓝、黄、绿四种颜色，帮助您快速认知自我、理解他人。',
    instructions: '本测评共 16 题，每题按 1-5 分打分，请根据您的真实情况作答。',
    coverColor: '#EF4444', icon: 'palette',
    questions: COLOR_QUESTIONS,
    dimensions: [{ code: '红', label: '红色性格', desc: '热情奔放，行动力强' }, { code: '蓝', label: '蓝色性格', desc: '深思缜密，追求完美' }, { code: '黄', label: '黄色性格', desc: '目标坚定，掌控力强' }, { code: '绿', label: '绿色性格', desc: '平和包容，随遇而安' }],
    reportTemplates: { code: 'color', dimensionLabels: DIMENSION_LABELS.color, templates: COLOR_TEMPLATES },
    sortOrder: 4,
  },
  {
    id: 15,
    code: 'sbti', name: 'SBTI 团队角色测评', nameEn: 'SBTI Team Role Assessment', category: '团队测评',
    description: '从战略、平衡、团队、创新四个维度，帮您找到自己在团队中最擅长的角色定位，提升团队协作效能。',
    instructions: '本测评共 16 题，每题按 1-5 分打分，请根据您在团队中的真实表现作答。',
    coverColor: '#10B981', icon: 'users',
    questions: SBTI_QUESTIONS,
    dimensions: [{ code: '战略', label: '战略型', desc: '高瞻远瞩，深谋远虑' }, { code: '平衡', label: '平衡型', desc: '协调各方，掌控节奏' }, { code: '团队', label: '团队型', desc: '凝聚人心，激发潜能' }, { code: '创新', label: '创新型', desc: '奇思妙想，打破常规' }],
    reportTemplates: { code: 'sbti', dimensionLabels: DIMENSION_LABELS.sbti, templates: SBTI_TEMPLATES },
    sortOrder: 5,
  },
  {
    id: 16,
    code: 'holland', name: '霍兰德职业兴趣测评', nameEn: 'Holland Career Interest Test', category: '职业测评',
    description: '基于霍兰德职业兴趣理论（RIASEC），通过六个职业兴趣类型，帮您找到适合自己的职业发展方向。',
    instructions: '本测评共 18 题，每题按 1-5 分打分，请根据您的兴趣偏好作答。',
    coverColor: '#8B5CF6', icon: 'briefcase',
    questions: HOLLAND_QUESTIONS,
    dimensions: [{ code: 'R', label: '现实型', desc: '动手实践' }, { code: 'I', label: '研究型', desc: '思考分析' }, { code: 'A', label: '艺术型', desc: '创意表达' }, { code: 'S', label: '社会型', desc: '助人合作' }, { code: 'E', label: '企业型', desc: '领导说服' }, { code: 'C', label: '常规型', desc: '规范有序' }],
    reportTemplates: { code: 'holland', dimensionLabels: DIMENSION_LABELS.holland, templates: HOLLAND_TEMPLATES },
    sortOrder: 6,
  },
  {
    id: 3,
    code: 'qinzi', name: '亲子学业压力沟通测评', nameEn: 'Parent-Child Communication Test', category: '亲子测评',
    description: '从亲子沟通情况、学业焦虑、心理韧性三个维度，帮助您看见孩子学业压力下的情绪状态，找到更温暖的沟通方式。',
    instructions: '本测评共 34 题，分为「亲子沟通情况」「学业焦虑」「心理韧性」三个部分，请按提示逐部分作答，以您与孩子相处的真实情况为准，没有对错之分。',
    coverColor: '#BC6E43', icon: 'heart',
    questions: QINZI_QUESTIONS.map(q => ({
      ...q,
      options: q.lie ? COMM_OPTIONS : OPTION_SETS[q.dimension || ''] || [],
    })),
    dimensions: [
      { code: 'comm', label: '亲子沟通情况', desc: '亲子沟通的开放性、尊重度与安全感（越高越好）' },
      { code: 'anx', label: '学业焦虑', desc: '面对孩子学业时的焦虑水平（越低越好）' },
      { code: 'res', label: '心理韧性', desc: '孩子面对困难时的适应与恢复能力（越高越好）' },
    ],
    reportTemplates: { code: 'qinzi', dimensionLabels: DIMENSION_LABELS.qinzi, templates: QINZI_TEMPLATES },
    sortOrder: 3,
  },
  {
    id: 1,
    code: 'love', name: '爱情三角测评', nameEn: 'Love Triangle Assessment', category: '恋爱测评',
    description: '基于 Sternberg 爱情三角理论，从亲密、激情、承诺三个维度，帮您看清自己爱情的形态。',
    instructions: '本测评共 12 题，请根据您当前（或最近一段）亲密关系的真实感受作答，没有对错之分。',
    coverColor: '#E8556D', icon: 'heart',
    questions: LOVE_QUESTIONS,
    dimensions: [
      { code: 'intimacy', label: '亲密', desc: '情感连接、理解与支持（越高越好）' },
      { code: 'passion', label: '激情', desc: '生理吸引、渴望与浪漫（越高越好）' },
      { code: 'commitment', label: '承诺', desc: '长久决定、责任与规划（越高越好）' },
    ],
    reportTemplates: { code: 'love', dimensionLabels: DIMENSION_LABELS.love, templates: LOVE_TEMPLATES },
    sortOrder: 1,
  },
  {
    id: 2,
    code: 'las', name: '爱情态度量表', nameEn: 'Love Attitude Scale', category: '恋爱测评',
    description: '基于 Hendrick & Hendrick 爱情态度理论（Love Attitude Scale），从浪漫、游戏、同伴、现实、占有、奉献六种爱情色彩，帮您看清自己在爱情中的真实态度与倾向。',
    instructions: '本测评共 42 题，请根据您当前（或最近一段）亲密关系的真实感受作答，用「非常不同意」到「非常同意」描述您对每句话的认同程度，没有对错之分。',
    coverColor: '#8B5CF6', icon: 'heart',
    questions: LAS_QUESTIONS,
    dimensions: [
      { code: 'eros', label: '浪漫型 Eros', desc: '激情与一见钟情的吸引（越高越倾向）' },
      { code: 'ludus', label: '游戏型 Ludus', desc: '自由多变、享受追逐（越高越倾向）' },
      { code: 'storge', label: '同伴型 Storge', desc: '由友情发展的深厚情感（越高越倾向）' },
      { code: 'pragma', label: '现实型 Pragma', desc: '理性匹配、条件考量（越高越倾向）' },
      { code: 'mania', label: '占有型 Mania', desc: '浓烈依赖、患得患失（越高越倾向）' },
      { code: 'agape', label: '奉献型 Agape', desc: '无私付出、不求回报（越高越倾向）' },
    ],
    reportTemplates: { code: 'las', dimensionLabels: DIMENSION_LABELS.las, templates: LAS_TEMPLATES },
    sortOrder: 2,
  },
];

async function main() {
  console.log('🌱 寻心理测评平台 - 开始初始化种子数据...\n');

  // 1. 管理员账号
  const adminUsername = process.env.ADMIN_USERNAME || 'admin';
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
  const existingAdmin = await prisma.user.findUnique({ where: { username: adminUsername } });
  if (!existingAdmin) {
    await prisma.user.create({
      data: {
        username: adminUsername,
        password: bcrypt.hashSync(adminPassword, 10),
        displayName: process.env.ADMIN_DISPLAY_NAME || '平台管理员',
        role: 'admin',
      },
    });
    console.log(`✅ 管理员账号已创建: ${adminUsername} / ${adminPassword}`);
  } else {
    console.log(`⏭️  管理员账号已存在: ${adminUsername}`);
  }

  // 2. 预设测评（存在则更新，保证题目/模板同步）
  for (const a of ASSESSMENTS) {
    const existing = await prisma.assessment.findUnique({ where: { code: a.code } });
    if (existing) {
      await prisma.assessment.update({
        where: { code: a.code },
        data: {
          name: a.name,
          nameEn: a.nameEn,
          category: a.category,
          description: a.description,
          instructions: a.instructions,
          coverColor: a.coverColor,
          icon: a.icon,
          questions: JSON.stringify(a.questions),
          dimensions: JSON.stringify(a.dimensions),
          reportTemplates: JSON.stringify(a.reportTemplates),
          status: 'published',
          sortOrder: a.sortOrder,
        },
      });
      console.log(`🔄 测评已更新: ${a.name} (${a.code})`);
      continue;
    }
    await prisma.assessment.create({
      data: {
        id: a.id,
        code: a.code,
        name: a.name,
        nameEn: a.nameEn,
        category: a.category,
        description: a.description,
        instructions: a.instructions,
        coverColor: a.coverColor,
        icon: a.icon,
        questions: JSON.stringify(a.questions),
        dimensions: JSON.stringify(a.dimensions),
        reportTemplates: JSON.stringify(a.reportTemplates),
        status: 'published',
        sortOrder: a.sortOrder,
        fillCount: 0,
      },
    });
    console.log(`✅ 测评已创建: ${a.name} (${a.code})`);
  }

  // 3. 汇总
  const [userCount, assessmentCount, responseCount] = await Promise.all([
    prisma.user.count(),
    prisma.assessment.count(),
    prisma.response.count(),
  ]);
  console.log(`\n📊 当前数据统计：用户 ${userCount} 个，测评 ${assessmentCount} 个，答卷 ${responseCount} 份`);
  console.log('🎉 种子数据初始化完成！');
}

main()
  .catch(e => { console.error('❌ 种子数据初始化失败:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
