/*
 * Copyright (c) 2019 Apple, Inc. All rights reserved.
 *
 * @APPLE_LICENSE_HEADER_START@
 *
 * The contents of this file constitute Original Code as defined in and
 * are subject to the Apple Public Source License Version 1.1 (the
 * "License").  You may not use this file except in compliance with the
 * License.  Please obtain a copy of the License at
 * http://www.apple.com/publicsource and read it before using this file.
 *
 * This Original Code and all software distributed under the License are
 * distributed on an "AS IS" basis, WITHOUT WARRANTY OF ANY KIND, EITHER
 * EXPRESS OR IMPLIED, AND APPLE HEREBY DISCLAIMS ALL SUCH WARRANTIES,
 * INCLUDING WITHOUT LIMITATION, ANY WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE OR NON-INFRINGEMENT.  Please see the
 * License for the specific language governing rights and limitations
 * under the License.
 *
 * @APPLE_LICENSE_HEADER_END@
 */

inline uint64_t VMCS_VPID                        = 0x00000000;
inline uint64_t VMCS_CTRL_POSTED_INT_N_VECTOR    = 0x00000002;
inline uint64_t VMCS_CTRL_EPTP_INDEX             = 0x00000004;
inline uint64_t VMCS_GUEST_ES                    = 0x00000800;
inline uint64_t VMCS_GUEST_CS                    = 0x00000802;
inline uint64_t VMCS_GUEST_SS                    = 0x00000804;
inline uint64_t VMCS_GUEST_DS                    = 0x00000806;
inline uint64_t VMCS_GUEST_FS                    = 0x00000808;
inline uint64_t VMCS_GUEST_GS                    = 0x0000080a;
inline uint64_t VMCS_GUEST_LDTR                  = 0x0000080c;
inline uint64_t VMCS_GUEST_TR                    = 0x0000080e;
inline uint64_t VMCS_GUEST_INT_STATUS            = 0x00000810;
inline uint64_t VMCS_GUESTPML_INDEX              = 0x00000812;
inline uint64_t VMCS_HOST_ES                     = 0x00000c00;
inline uint64_t VMCS_HOST_CS                     = 0x00000c02;
inline uint64_t VMCS_HOST_SS                     = 0x00000c04;
inline uint64_t VMCS_HOST_DS                     = 0x00000c06;
inline uint64_t VMCS_HOST_FS                     = 0x00000c08;
inline uint64_t VMCS_HOST_GS                     = 0x00000c0a;
inline uint64_t VMCS_HOST_TR                     = 0x00000c0c;
inline uint64_t VMCS_CTRL_IO_BITMAP_A            = 0x00002000;
inline uint64_t VMCS_CTRL_IO_BITMAP_B            = 0x00002002;
inline uint64_t VMCS_CTRL_MSR_BITMAPS            = 0x00002004;
inline uint64_t VMCS_CTRL_VMEXIT_MSR_STORE_ADDR  = 0x00002006;
inline uint64_t VMCS_CTRL_VMEXIT_MSR_LOAD_ADDR   = 0x00002008;
inline uint64_t VMCS_CTRL_VMENTRY_MSR_LOAD_ADDR  = 0x0000200a;
inline uint64_t VMCS_CTRL_EXECUTIVE_VMCS_PTR     = 0x0000200c;
inline uint64_t VMCS_CTRL_PML_ADDR               = 0x0000200e;
inline uint64_t VMCS_CTRL_TSC_OFFSET             = 0x00002010;
inline uint64_t VMCS_CTRL_VIRTUAL_APIC           = 0x00002012;
inline uint64_t VMCS_CTRL_APIC_ACCESS            = 0x00002014;
inline uint64_t VMCS_CTRL_POSTED_INT_DESC_ADDR   = 0x00002016;
inline uint64_t VMCS_CTRL_VMFUNC_CTRL            = 0x00002018;
inline uint64_t VMCS_CTRL_EPTP                   = 0x0000201a;
inline uint64_t VMCS_CTRL_EOI_EXIT_BITMAP_0      = 0x0000201c;
inline uint64_t VMCS_CTRL_EOI_EXIT_BITMAP_1      = 0x0000201e;
inline uint64_t VMCS_CTRL_EOI_EXIT_BITMAP_2      = 0x00002020;
inline uint64_t VMCS_CTRL_EOI_EXIT_BITMAP_3      = 0x00002022;
inline uint64_t VMCS_CTRL_EPTP_LIST_ADDR         = 0x00002024;
inline uint64_t VMCS_CTRL_VMREAD_BITMAP_ADDR     = 0x00002026;
inline uint64_t VMCS_CTRL_VMWRITE_BITMAP_ADDR    = 0x00002028;
inline uint64_t VMCS_CTRL_VIRT_EXC_INFO_ADDR     = 0x0000202a;
inline uint64_t VMCS_CTRL_XSS_EXITING_BITMAP     = 0x0000202c;
inline uint64_t VMCS_CTRL_ENCLS_EXITING_BITMAP   = 0x0000202e;
inline uint64_t VMCS_CTRL_SPP_TABLE              = 0x00002030;
inline uint64_t VMCS_CTRL_TSC_MULTIPLIER         = 0x00002032;
inline uint64_t VMCS_CTRL_ENCLV_EXITING_BITMAP   = 0x00002036;
inline uint64_t VMCS_GUEST_PHYSICAL_ADDRESS      = 0x00002400;
inline uint64_t VMCS_GUEST_LINK_POINTER          = 0x00002800;
inline uint64_t VMCS_GUEST_IA32_DEBUGCTL         = 0x00002802;
inline uint64_t VMCS_GUEST_IA32_PAT              = 0x00002804;
inline uint64_t VMCS_GUEST_IA32_EFER             = 0x00002806;
inline uint64_t VMCS_GUEST_IA32_PERF_GLOBAL_CTRL = 0x00002808;
inline uint64_t VMCS_GUEST_PDPTE0                = 0x0000280a;
inline uint64_t VMCS_GUEST_PDPTE1                = 0x0000280c;
inline uint64_t VMCS_GUEST_PDPTE2                = 0x0000280e;
inline uint64_t VMCS_GUEST_PDPTE3                = 0x00002810;
inline uint64_t VMCS_GUEST_IA32_BNDCFGS          = 0x00002812;
inline uint64_t VMCS_GUEST_IA32_RTIT_CTL         = 0x00002814;
inline uint64_t VMCS_GUEST_IA32_PKRS             = 0x00002818;
inline uint64_t VMCS_HOST_IA32_PAT               = 0x00002c00;
inline uint64_t VMCS_HOST_IA32_EFER              = 0x00002c02;
inline uint64_t VMCS_HOST_IA32_PERF_GLOBAL_CTRL  = 0x00002c04;
inline uint64_t VMCS_HOST_IA32_PKRS              = 0x00002c06;
inline uint64_t VMCS_CTRL_PIN_BASED              = 0x00004000;
inline uint64_t VMCS_CTRL_CPU_BASED              = 0x00004002;
inline uint64_t VMCS_CTRL_EXC_BITMAP             = 0x00004004;
inline uint64_t VMCS_CTRL_PF_ERROR_MASK          = 0x00004006;
inline uint64_t VMCS_CTRL_PF_ERROR_MATCH         = 0x00004008;
inline uint64_t VMCS_CTRL_CR3_COUNT              = 0x0000400a;
inline uint64_t VMCS_CTRL_VMEXIT_CONTROLS        = 0x0000400c;
inline uint64_t VMCS_CTRL_VMEXIT_MSR_STORE_COUNT = 0x0000400e;
inline uint64_t VMCS_CTRL_VMEXIT_MSR_LOAD_COUNT  = 0x00004010;
inline uint64_t VMCS_CTRL_VMENTRY_CONTROLS       = 0x00004012;
inline uint64_t VMCS_CTRL_VMENTRY_MSR_LOAD_COUNT = 0x00004014;
inline uint64_t VMCS_CTRL_VMENTRY_IRQ_INFO       = 0x00004016;
inline uint64_t VMCS_CTRL_VMENTRY_EXC_ERROR      = 0x00004018;
inline uint64_t VMCS_CTRL_VMENTRY_INSTR_LEN      = 0x0000401a;
inline uint64_t VMCS_CTRL_TPR_THRESHOLD          = 0x0000401c;
inline uint64_t VMCS_CTRL_CPU_BASED2             = 0x0000401e;
inline uint64_t VMCS_CTRL_PLE_GAP                = 0x00004020;
inline uint64_t VMCS_CTRL_PLE_WINDOW             = 0x00004022;
inline uint64_t VMCS_RO_INSTR_ERROR              = 0x00004400;
inline uint64_t VMCS_RO_EXIT_REASON              = 0x00004402;
inline uint64_t VMCS_RO_VMEXIT_IRQ_INFO          = 0x00004404;
inline uint64_t VMCS_RO_VMEXIT_IRQ_ERROR         = 0x00004406;
inline uint64_t VMCS_RO_IDT_VECTOR_INFO          = 0x00004408;
inline uint64_t VMCS_RO_IDT_VECTOR_ERROR         = 0x0000440a;
inline uint64_t VMCS_RO_VMEXIT_INSTR_LEN         = 0x0000440c;
inline uint64_t VMCS_RO_VMX_INSTR_INFO           = 0x0000440e;
inline uint64_t VMCS_GUEST_ES_LIMIT              = 0x00004800;
inline uint64_t VMCS_GUEST_CS_LIMIT              = 0x00004802;
inline uint64_t VMCS_GUEST_SS_LIMIT              = 0x00004804;
inline uint64_t VMCS_GUEST_DS_LIMIT              = 0x00004806;
inline uint64_t VMCS_GUEST_FS_LIMIT              = 0x00004808;
inline uint64_t VMCS_GUEST_GS_LIMIT              = 0x0000480a;
inline uint64_t VMCS_GUEST_LDTR_LIMIT            = 0x0000480c;
inline uint64_t VMCS_GUEST_TR_LIMIT              = 0x0000480e;
inline uint64_t VMCS_GUEST_GDTR_LIMIT            = 0x00004810;
inline uint64_t VMCS_GUEST_IDTR_LIMIT            = 0x00004812;
inline uint64_t VMCS_GUEST_ES_AR                 = 0x00004814;
inline uint64_t VMCS_GUEST_CS_AR                 = 0x00004816;
inline uint64_t VMCS_GUEST_SS_AR                 = 0x00004818;
inline uint64_t VMCS_GUEST_DS_AR                 = 0x0000481a;
inline uint64_t VMCS_GUEST_FS_AR                 = 0x0000481c;
inline uint64_t VMCS_GUEST_GS_AR                 = 0x0000481e;
inline uint64_t VMCS_GUEST_LDTR_AR               = 0x00004820;
inline uint64_t VMCS_GUEST_TR_AR                 = 0x00004822;
inline uint64_t VMCS_GUEST_INTERRUPTIBILITY      = 0x00004824;
inline uint64_t VMCS_GUEST_ACTIVITY_STATE        = 0x00004826;
inline uint64_t VMCS_GUEST_SMBASE                = 0x00004828;
inline uint64_t VMCS_GUEST_IA32_SYSENTER_CS      = 0x0000482a;
inline uint64_t VMCS_GUEST_VMX_TIMER_VALUE       = 0x0000482e;
inline uint64_t VMCS_HOST_IA32_SYSENTER_CS       = 0x00004c00;
inline uint64_t VMCS_CTRL_CR0_MASK               = 0x00006000;
inline uint64_t VMCS_CTRL_CR4_MASK               = 0x00006002;
inline uint64_t VMCS_CTRL_CR0_SHADOW             = 0x00006004;
inline uint64_t VMCS_CTRL_CR4_SHADOW             = 0x00006006;
inline uint64_t VMCS_CTRL_CR3_VALUE0             = 0x00006008;
inline uint64_t VMCS_CTRL_CR3_VALUE1             = 0x0000600a;
inline uint64_t VMCS_CTRL_CR3_VALUE2             = 0x0000600c;
inline uint64_t VMCS_CTRL_CR3_VALUE3             = 0x0000600e;
inline uint64_t VMCS_RO_EXIT_QUALIFIC            = 0x00006400;
inline uint64_t VMCS_RO_IO_RCX                   = 0x00006402;
inline uint64_t VMCS_RO_IO_RSI                   = 0x00006404;
inline uint64_t VMCS_RO_IO_RDI                   = 0x00006406;
inline uint64_t VMCS_RO_IO_RIP                   = 0x00006408;
inline uint64_t VMCS_RO_GUEST_LIN_ADDR           = 0x0000640a;
inline uint64_t VMCS_GUEST_CR0                   = 0x00006800;
inline uint64_t VMCS_GUEST_CR3                   = 0x00006802;
inline uint64_t VMCS_GUEST_CR4                   = 0x00006804;
inline uint64_t VMCS_GUEST_ES_BASE               = 0x00006806;
inline uint64_t VMCS_GUEST_CS_BASE               = 0x00006808;
inline uint64_t VMCS_GUEST_SS_BASE               = 0x0000680a;
inline uint64_t VMCS_GUEST_DS_BASE               = 0x0000680c;
inline uint64_t VMCS_GUEST_FS_BASE               = 0x0000680e;
inline uint64_t VMCS_GUEST_GS_BASE               = 0x00006810;
inline uint64_t VMCS_GUEST_LDTR_BASE             = 0x00006812;
inline uint64_t VMCS_GUEST_TR_BASE               = 0x00006814;
inline uint64_t VMCS_GUEST_GDTR_BASE             = 0x00006816;
inline uint64_t VMCS_GUEST_IDTR_BASE             = 0x00006818;
inline uint64_t VMCS_GUEST_DR7                   = 0x0000681a;
inline uint64_t VMCS_GUEST_RSP                   = 0x0000681c;
inline uint64_t VMCS_GUEST_RIP                   = 0x0000681e;
inline uint64_t VMCS_GUEST_RFLAGS                = 0x00006820;
inline uint64_t VMCS_GUEST_DEBUG_EXC             = 0x00006822;
inline uint64_t VMCS_GUEST_SYSENTER_ESP          = 0x00006824;
inline uint64_t VMCS_GUEST_SYSENTER_EIP          = 0x00006826;
inline uint64_t VMCS_GUEST_IA32_S_CET            = 0x00006828;
inline uint64_t VMCS_GUEST_SSP                   = 0x0000682a;
inline uint64_t VMCS_GUEST_IA32_INTR_SSP_TABLE_ADDR = 0x0000682c;
inline uint64_t VMCS_HOST_CR0                    = 0x00006c00;
inline uint64_t VMCS_HOST_CR3                    = 0x00006c02;
inline uint64_t VMCS_HOST_CR4                    = 0x00006c04;
inline uint64_t VMCS_HOST_FS_BASE                = 0x00006c06;
inline uint64_t VMCS_HOST_GS_BASE                = 0x00006c08;
inline uint64_t VMCS_HOST_TR_BASE                = 0x00006c0a;
inline uint64_t VMCS_HOST_GDTR_BASE              = 0x00006c0c;
inline uint64_t VMCS_HOST_IDTR_BASE              = 0x00006c0e;
inline uint64_t VMCS_HOST_IA32_SYSENTER_ESP      = 0x00006c10;
inline uint64_t VMCS_HOST_IA32_SYSENTER_EIP      = 0x00006c12;
inline uint64_t VMCS_HOST_RSP                    = 0x00006c14;
inline uint64_t VMCS_HOST_RIP                    = 0x00006c16;
inline uint64_t VMCS_HOST_IA32_S_CET             = 0x00006c18;
inline uint64_t VMCS_HOST_SSP                    = 0x00006c1a;
inline uint64_t VMCS_HOST_IA32_INTR_SSP_TABLE_ADDR = 0x00006c1c;

typedef struct {
    string vmcs_desc;
} strvmcs_t;

translator strvmcs_t < uint64_t X > {
    vmcs_desc =
    X == VMCS_CTRL_CPU_BASED         ? "Processor-based VM-execution controls" :
    X == VMCS_CTRL_VMENTRY_IRQ_INFO  ? "Interrupt Information" :
    X == VMCS_CTRL_TPR_THRESHOLD     ? "TPR Threshold" :
    X == VMCS_GUEST_INTERRUPTIBILITY ? "Interruptibility State" :
    X == VMCS_GUEST_IA32_EFER        ? "IA32 EFER" :
    X == VMCS_RO_IDT_VECTOR_INFO     ? "IDT Vector Info" :
    X == VMCS_RO_VMEXIT_INSTR_LEN    ? "Instruction Length" :
    X == VMCS_GUEST_CR0              ? "Guest CR0" :
    X == VMCS_GUEST_CR3              ? "Guest CR3" :
    X == VMCS_GUEST_CR4              ? "Guest CR4" :
    X == VMCS_GUEST_CS_BASE          ? "Guest CS base" :
    X == VMCS_RO_EXIT_QUALIFIC       ? "Exit Qualification" :

    "(unknown)";
};

inline int VMX_REASON_EXC_NMI           = 0;
inline int VMX_REASON_IRQ               = 1;
inline int VMX_REASON_TRIPLE_FAULT      = 2;
inline int VMX_REASON_INIT              = 3;
inline int VMX_REASON_SIPI              = 4;
inline int VMX_REASON_IO_SMI            = 5;
inline int VMX_REASON_OTHER_SMI         = 6;
inline int VMX_REASON_IRQ_WND           = 7;
inline int VMX_REASON_VIRTUAL_NMI_WND   = 8;
inline int VMX_REASON_TASK              = 9;
inline int VMX_REASON_CPUID             = 10;
inline int VMX_REASON_GETSEC            = 11;
inline int VMX_REASON_HLT               = 12;
inline int VMX_REASON_INVD              = 13;
inline int VMX_REASON_INVLPG            = 14;
inline int VMX_REASON_RDPMC             = 15;
inline int VMX_REASON_RDTSC             = 16;
inline int VMX_REASON_RSM               = 17;
inline int VMX_REASON_VMCALL            = 18;
inline int VMX_REASON_VMCLEAR           = 19;
inline int VMX_REASON_VMLAUNCH          = 20;
inline int VMX_REASON_VMPTRLD           = 21;
inline int VMX_REASON_VMPTRST           = 22;
inline int VMX_REASON_VMREAD            = 23;
inline int VMX_REASON_VMRESUME          = 24;
inline int VMX_REASON_VMWRITE           = 25;
inline int VMX_REASON_VMOFF             = 26;
inline int VMX_REASON_VMON              = 27;
inline int VMX_REASON_MOV_CR            = 28;
inline int VMX_REASON_MOV_DR            = 29;
inline int VMX_REASON_IO                = 30;
inline int VMX_REASON_RDMSR             = 31;
inline int VMX_REASON_WRMSR             = 32;
inline int VMX_REASON_VMENTRY_GUEST     = 33;
inline int VMX_REASON_VMENTRY_MSR       = 34;
inline int VMX_REASON_MWAIT             = 36;
inline int VMX_REASON_MTF               = 37;
inline int VMX_REASON_MONITOR           = 39;
inline int VMX_REASON_PAUSE             = 40;
inline int VMX_REASON_VMENTRY_MC        = 41;
inline int VMX_REASON_TPR_THRESHOLD     = 43;
inline int VMX_REASON_APIC_ACCESS       = 44;
inline int VMX_REASON_VIRTUALIZED_EOI   = 45;
inline int VMX_REASON_GDTR_IDTR         = 46;
inline int VMX_REASON_LDTR_TR           = 47;
inline int VMX_REASON_EPT_VIOLATION     = 48;
inline int VMX_REASON_EPT_MISCONFIG     = 49;
inline int VMX_REASON_EPT_INVEPT        = 50;
inline int VMX_REASON_RDTSCP            = 51;
inline int VMX_REASON_VMX_TIMER_EXPIRED = 52;
inline int VMX_REASON_INVVPID           = 53;
inline int VMX_REASON_WBINVD            = 54;
inline int VMX_REASON_XSETBV            = 55;
inline int VMX_REASON_APIC_WRITE        = 56;
inline int VMX_REASON_RDRAND            = 57;
inline int VMX_REASON_INVPCID           = 58;
inline int VMX_REASON_VMFUNC            = 59;
inline int VMX_REASON_ENCLS             = 60;
inline int VMX_REASON_RDSEED            = 61;
inline int VMX_REASON_PML_FULL          = 62;
inline int VMX_REASON_XSAVES            = 63;
inline int VMX_REASON_XRSTORS           = 64;
inline int VMX_REASON_SPP_EVENT         = 66;
inline int VMX_REASON_UMWAIT            = 67;
inline int VMX_REASON_TPAUSE            = 68;

typedef struct {
    string vmexit_desc;
} strvmexit_t;

translator strvmexit_t < uint16_t X > {
    vmexit_desc =

    X == VMX_REASON_EPT_VIOLATION     ? "EPT Violation" :
    X == VMX_REASON_IRQ_WND           ? "Interrupt Window" :
    X == VMX_REASON_IRQ               ? "External Interrupt" :
    X == VMX_REASON_IO                ? "IO instruction" :
    X == VMX_REASON_HLT               ? "HLT instruction" :
    X == VMX_REASON_RDPMC             ? "RDPMC instruction" :
    X == VMX_REASON_RDMSR             ? "RDMSR instruction" :
    X == VMX_REASON_WRMSR             ? "WRMSR instruction" :
    X == VMX_REASON_EXC_NMI           ? "Exception or NMI" :
    X == VMX_REASON_TRIPLE_FAULT      ? "Triple Fault" :
    X == VMX_REASON_INIT              ? "INIT Signal" :
    X == VMX_REASON_SIPI              ? "Startup IPI" :
    X == VMX_REASON_IO_SMI            ? "I/O SMM Interrupt" :
    X == VMX_REASON_OTHER_SMI         ? "Other SMM Interrupt" :
    X == VMX_REASON_VIRTUAL_NMI_WND   ? "NMI Window" :
    X == VMX_REASON_TASK              ? "Task Switch" :
    X == VMX_REASON_CPUID             ? "CPUID instruction" :
    X == VMX_REASON_GETSEC            ? "GETSEC instruction" :
    X == VMX_REASON_INVD              ? "INVD instruction" :
    X == VMX_REASON_INVLPG            ? "INVLPG instruction" :
    X == VMX_REASON_RDTSC             ? "RDTSC instruction" :
    X == VMX_REASON_RSM               ? "RSM in SMM" :
    X == VMX_REASON_VMCALL            ? "VMCALL instruction" :
    X == VMX_REASON_VMCLEAR           ? "VMCLEAR instruction" :
    X == VMX_REASON_VMLAUNCH          ? "VMLAUNCH instruction" :
    X == VMX_REASON_VMPTRLD           ? "VMPTRLD instruction" :
    X == VMX_REASON_VMPTRST           ? "VMPTRST instruction" :
    X == VMX_REASON_VMREAD            ? "VMREAD instruction" :
    X == VMX_REASON_VMRESUME          ? "VMRESUME instruction" :
    X == VMX_REASON_VMWRITE           ? "VMWRITE instruction" :
    X == VMX_REASON_VMOFF             ? "VMXOFF instruction" :
    X == VMX_REASON_VMON              ? "VMON instruction" :
    X == VMX_REASON_MOV_CR            ? "CR access" :
    X == VMX_REASON_MOV_DR            ? "DR access" :
    X == VMX_REASON_VMENTRY_GUEST     ? "VMENTRY failure - guest state" :
    X == VMX_REASON_VMENTRY_MSR       ? "VMENTRY failure - MSR loading" :
    X == VMX_REASON_MWAIT             ? "MWAIT instruction" :
    X == VMX_REASON_MTF               ? "Monitor Trap Flag" :
    X == VMX_REASON_MONITOR           ? "MONITOR instruction" :
    X == VMX_REASON_PAUSE             ? "PAUSE instruction" :
    X == VMX_REASON_VMENTRY_MC        ? "VMENTRY Machine Check" :
    X == VMX_REASON_TPR_THRESHOLD     ? "TPR Below Threshold" :
    X == VMX_REASON_APIC_ACCESS       ? "APIC Access" :
    X == VMX_REASON_VIRTUALIZED_EOI   ? "Virtualized EOI" :
    X == VMX_REASON_GDTR_IDTR         ? "Access GDTR or IDTR" :
    X == VMX_REASON_LDTR_TR           ? "Access LDTR or TR" :
    X == VMX_REASON_EPT_MISCONFIG     ? "EPT Misconfiguration" :
    X == VMX_REASON_EPT_INVEPT        ? "INVEPT instruction" :
    X == VMX_REASON_RDTSCP            ? "RDTSCP instruction" :
    X == VMX_REASON_VMX_TIMER_EXPIRED ? "VMX-preemption timer expired" :
    X == VMX_REASON_INVVPID           ? "INVVPID instruction" :
    X == VMX_REASON_WBINVD            ? "WBINVD instruction" :
    X == VMX_REASON_XSETBV            ? "XSETBV instruction" :
    X == VMX_REASON_APIC_WRITE        ? "APIC write" :
    X == VMX_REASON_RDRAND            ? "RDRAND instruction" :
    X == VMX_REASON_INVPCID           ? "INVPCID instruction" :
    X == VMX_REASON_VMFUNC            ? "VMFUNC instruction" :
    X == VMX_REASON_ENCLS             ? "ENCLS instruction" :
    X == VMX_REASON_RDSEED            ? "RDSEED instruction" :
    X == VMX_REASON_PML_FULL          ? "PML Full" :
    X == VMX_REASON_XSAVES            ? "XSAVES instruction" :
    X == VMX_REASON_XRSTORS           ? "XRSTORS instruction" :
    X == VMX_REASON_SPP_EVENT         ? "SPP-related event" :
    X == VMX_REASON_UMWAIT            ? "UMWAIT instruction" :
    X == VMX_REASON_TPAUSE            ? "TPAUSE instruction" :

    "(unknown)";
};

typedef struct {
	uint64_t rip;
	uint64_t rflags;
	uint64_t rax;
	uint64_t rcx;
	uint64_t rdx;
	uint64_t rbx;
	uint64_t rsi;
	uint64_t rdi;
	uint64_t rsp;
	uint64_t rbp;
	uint64_t r8;
	uint64_t r9;
	uint64_t r10;
	uint64_t r11;
	uint64_t r12;
	uint64_t r13;
	uint64_t r14;
	uint64_t r15;
	uint64_t cs;
	uint64_t ss;
	uint64_t ds;
	uint64_t es;
	uint64_t fs;
	uint64_t gs;
	uint64_t idt_base;
	uint64_t idt_limit;
	uint64_t gdt_base;
	uint64_t gdt_limit;
	uint64_t ldtr;
	uint64_t ldt_base;
	uint64_t ldt_limit;
	uint64_t ldt_ar;
	uint64_t tr;
	uint64_t tss_base;
	uint64_t tss_limit;
	uint64_t tss_ar;
	uint64_t cr0;
	uint64_t cr1;
	uint64_t cr2;
	uint64_t cr3;
	uint64_t cr4;
	uint64_t dr0;
	uint64_t dr1;
	uint64_t dr2;
	uint64_t dr3;
	uint64_t dr4;
	uint64_t dr5;
	uint64_t dr6;
	uint64_t dr7;
	uint64_t tpr;
	uint64_t xcr0;
} guest_regs_t;

translator guest_regs_t < uint64_t *X > {
	rip       = vmregs[VMCS_GUEST_RIP];
	rflags    = vmregs[VMCS_GUEST_RFLAGS];
	rax       = X[2];
	rcx       = X[3];
	rdx       = X[4];
	rbx       = X[5];
	rsi       = X[6];
	rdi       = X[7];
	rsp       = vmregs[VMCS_GUEST_RSP];
	rbp       = X[9];
	r8        = X[10];
	r9        = X[11];
	r10       = X[12];
	r11       = X[13];
	r12       = X[14];
	r13       = X[15];
	r14       = X[16];
	r15       = X[17];
	cs        = vmregs[VMCS_GUEST_CS];
	ss        = vmregs[VMCS_GUEST_SS];
	ds        = vmregs[VMCS_GUEST_DS];
	es        = vmregs[VMCS_GUEST_ES];
	fs        = vmregs[VMCS_GUEST_FS];
	gs        = vmregs[VMCS_GUEST_GS];
	idt_base  = vmregs[VMCS_GUEST_IDTR_BASE];
	idt_limit = vmregs[VMCS_GUEST_IDTR_LIMIT];
	gdt_base  = vmregs[VMCS_GUEST_GDTR_BASE];
	gdt_limit = vmregs[VMCS_GUEST_GDTR_LIMIT];
	ldtr      = vmregs[VMCS_GUEST_LDTR];
	ldt_base  = vmregs[VMCS_GUEST_LDTR_BASE];
	ldt_limit = vmregs[VMCS_GUEST_LDTR_LIMIT];
	ldt_ar    = vmregs[VMCS_GUEST_LDTR_AR];
	tr        = vmregs[VMCS_GUEST_TR];
	tss_base  = vmregs[VMCS_GUEST_TR_BASE];
	tss_limit = vmregs[VMCS_GUEST_TR_LIMIT];
	tss_ar    = vmregs[VMCS_GUEST_TR_AR];
	cr0       = vmregs[VMCS_GUEST_CR0];
	cr1       = X[37];
	cr2       = X[38];
	cr3       = vmregs[VMCS_GUEST_CR3];
	cr4       = vmregs[VMCS_GUEST_CR4];
	dr0       = X[41];
	dr1       = X[42];
	dr2       = X[43];
	dr3       = X[44];
	dr4       = X[45];
	dr5       = X[46];
	dr6       = X[47];
	dr7       = vmregs[VMCS_GUEST_DR7];
	tpr       = X[49];
	xcr0      = X[50];
};

typedef struct {
	uint16_t offset;
	uint8_t  type;
	uint8_t  async;
} vmcs_eq_apic_access_t;

translator vmcs_eq_apic_access_t < uint64_t X > {
	offset = (X >> 0x00) & 0xfff;
	type   = (X >> 0x0c) & 0x00f;
	async  = (X >> 0x10) & 0x001;
};

typedef struct {
	uint8_t read;
	uint8_t write;
	uint8_t exec;
	uint8_t readable;
	uint8_t writable;
	uint8_t executable;
	uint8_t user_executable;
	uint8_t guest_linear_valid;
	uint8_t linear;
	uint8_t user_address;
	uint8_t rw_page;
	uint8_t nx_page;
	uint8_t nmi_unblocking;
	uint8_t shadow_stack_access;
	uint8_t shadow;
	uint8_t async;
} vmcs_eq_ept_violation_t;

translator vmcs_eq_ept_violation_t <uint64_t X > {
	read                = (X >> 0x00) & 1;
	write               = (X >> 0x01) & 1;
	exec                = (X >> 0x02) & 1;
	readable            = (X >> 0x03) & 1;
	writable            = (X >> 0x04) & 1;
	executable          = (X >> 0x05) & 1;
	user_executable     = (X >> 0x06) & 1;
	guest_linear_valid  = (X >> 0x07) & 1;
	linear              = (X >> 0x08) & 1;
	user_address        = (X >> 0x09) & 1;
	rw_page             = (X >> 0x0a) & 1;
	nx_page             = (X >> 0x0b) & 1;
	nmi_unblocking      = (X >> 0x0c) & 1;
	shadow_stack_access = (X >> 0x0d) & 1;
	shadow              = (X >> 0x0e) & 1;
	async               = (X >> 0x10) & 1;
};

typedef struct {
	uint8_t vector;
	uint8_t external;
	uint8_t nmi;
	uint8_t hw_exception;
	uint8_t sw_interrupt;
	uint8_t priv_soft_exc;
	uint8_t soft_exception;
	uint8_t error_valid;
	uint8_t valid;
} vmcs_irq_info_t;

translator vmcs_irq_info_t < uint32_t X > {
	vector        = (X >> 0x00) & 0xff;
	external      = ((X >> 0x08) & 0x3) == 0 ? 1 : 0;
	nmi           = ((X >> 0x08) & 0x3) == 2 ? 1 : 0;
	hw_exception  = ((X >> 0x08) & 0x3) == 3 ? 1 : 0;
	sw_interrupt  = ((X >> 0x08) & 0x3) == 4 ? 1 : 0;
	priv_soft_exc = ((X >> 0x08) & 0x3) == 5 ? 1 : 0;
	soft_exception = ((X >> 0x08) & 0x3) == 6 ? 1 : 0;
	error_valid   = (X >> 0x0b) & 1;
	valid         = (X >> 0x31) & 1;
};

typedef struct {
	uint8_t size;
	uint8_t direction;
	uint8_t str;
	uint8_t rep;
	uint8_t encoding;
	uint16_t port;
} vmcs_eq_io_t;

translator vmcs_eq_io_t < uint64_t X > {
	size      = (X >> 0x00) & 0x0003;
	direction = (X >> 0x03) & 0x0001;
	str       = (X >> 0x04) & 0x0001;
	rep       = (X >> 0x05) & 0x0001;
	encoding  = (X >> 0x06) & 0x0001;
	port      = (X >> 0x10) & 0xffff;
};

typedef struct {
	uint8_t redirection_hint;
	uint8_t destination_mode;
	uint8_t destination;
} msi_addr_t;

translator msi_addr_t < uint32_t X > {
	redirection_hint   = (X >> 2)  & 1;
	destination_mode   = (X >> 3)  & 1;
	destination        = (X >> 12) & 0xff;
};

typedef struct {
	uint8_t vector;
	uint8_t delivery_mode;
	uint8_t level;
	uint8_t trigger_mode;
} msi_data_t;

translator msi_data_t < uint32_t X > {
	vector        = X & 0xff;
	delivery_mode = (X >> 8)  & 0x3;
	level         = (X >> 14) & 0x1;
	trigger_mode  = (X >> 15) & 0x1;
};
