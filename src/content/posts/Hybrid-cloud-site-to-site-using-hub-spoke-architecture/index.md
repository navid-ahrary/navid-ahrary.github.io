---
title: "Hybrid Cloud Site-to-Site Using Hub-Spoke Architecture"

description: "What do you do when cloud workloads need access to on-premises services, and your enterprise users need to access resources in the cloud?"

publishedDate: 2026-09-11

category: "Hybrid Cloud"

tags:

- Azure
- Azure VM
- VPN Gateway
- Site-to-Site VPN
- Hub-Spoke
- Architecture

featured: true
draft: false

banner: "./hub-spoke-1.png"
---

&nbsp;

**![hub-spoke-1.png](:/64b269c4202c434ba174b4a6fbee234e)**

**What do you do when cloud workloads need access to on-premises services, and your enterprise users need to access resources in the cloud?**

There are multiple ways to solve this problem. But when you need a scalable and secure network, a **Site-to-Site VPN combined with a Hub-Spoke architecture** is a solid approach.

That's exactly what I implemented in Azure.

The design consists of:

- **Hub VNet - `10.100.0.0/26`**  
    The central connectivity layer, hosting the VPN Gateway and dedicated GatewaySubnet.
- **Spoke VNet 1 – `10.100.1.0/24`**  
    A dedicated workload network running Azure VMs.
- **Spoke VNet 2 – `10.100.2.0/24`**  
    An AI-focused workload with **Microsoft Foundry** accessed through a **Private Endpoint**.
- **On-premises – `192.168.0.0/16`**  
    Connected to Azure through an **IPsec Site-to-Site VPN** by **Local Gateway.** The **Local Gateway** presents the On-premises network in Azure.

&nbsp;

## Network segmentation

One of the first thing to consider is "network segmentaion".

All Spoke VNets are peered with the Hub VNet. So, We should havea plan for IP address from the beggining:

1. "Avoid IP overlapping" between on-premeses network and Azure Vnets.
2. "Use Address Space effeciently", We don't want consume extra IP ranges today, because the worloads and networks may grow in the future,

In the design, the Hub uses `10.100.0.0/26`, and each workloads has its own `/24` IP range.

This design allows the Hub to focus on connectivity, while workloads network can extend easy.

&nbsp;

## Connectivity Management

In this design, I've also used NSGs to control traffic between the spokes.

In each NSG, the default `AllowVNetInBound` and `AllowVNetOutBound` rules allow traffic between resources within the VNet and connected virtual networks.

So by adding higher-priority NSG rules to each spoke subnet, we can excplicity block Spoke-to-Spoke traffic:

### NSG-Spoke1

| Priority | Direction | Source | Destination | Action |
| ---: | --- | --- | --- | --- |
| 200 | Inbound | `10.100.2.0/24` | `10.100.1.0/24` | Deny |
| 200 | Outbound | `10.100.1.0/24` | `10.100.2.0/24` | Deny |

&nbsp;

### NSG-Spoke2

| Priority | Direction | Source | Destination | Action |
| ---: | --- | --- | --- | --- |
| 200 | Inbound | `10.100.1.0/24` | `10.100.2.0/24` | Deny |
| 200 | Outbound | `10.100.2.0/24` | `10.100.1.0/24` | Deny |

&nbsp;

To control traffic between on-premises network and cloud sevices, we can implement same approach.

## Routing

### On-premises to Spokes

```text
On-Premises
    │
    │ Site-to-Site VPN / IPsec
    ▼
Azure VPN Gateway
    │
    ▼
Hub VNet
    │
    │ VNet Peering
    ▼
Spoke VNet
    │
    ▼
Spoke Services
```

The important architectural point is that **the on-premises network does not connect directly to the spoke**. Traffic enters Azure through the Hub and is then routed to the Spokes.

&nbsp;

### Spokes to On-premises

For a response or outbound request back to an on-premises service:

```text
Spoke Services
    │
    ▼
Spoke VNet
    │
    │ VNet Peering
    ▼
Hub VNet
    │
    ▼
VPN Gateway
    │
    │ Site-to-Site VPN
    ▼
On-Premises
```
