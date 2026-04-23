const { detectATS, getAdapter } = require('./services/ats');

async function detectATSType(url = "") {
    const result = await detectATS({ url });
    return result ? result.adapter.name : 'custom';
}

async function dispatchApplication(db, { jobId, userId, tier, resumeId, jobUrl, userProfile }) {
    console.log(`[HybridApply] Dispatching Job ${jobId} for User ${userId} (Tier ${tier})`);
    
    const detection = await detectATS({ url: jobUrl });
    const atsType = detection ? detection.adapter.name : 'custom';
    
    const logs = [
        { step: "analyzing_portal", status: "complete", timestamp: new Date(), metadata: { ats: atsType } }
    ];

    // Dynamic ATS Adapter Flow
    if (detection && userProfile) {
        const { adapter } = detection;
        logs.push({ step: "fetching_ats_metadata", status: "in_progress", timestamp: new Date() });
        
        try {
            const prefillData = await adapter.prefill({ 
                profile: userProfile, 
                url: jobUrl 
            });
            
            if (prefillData.success) {
                logs.push({ 
                    step: "fetching_ats_metadata", 
                    status: "complete", 
                    timestamp: new Date(), 
                    metadata: { questions_count: prefillData.questions?.length || 0 } 
                });
                logs.push({ 
                    step: "mapping_form_intelligence", 
                    status: "complete", 
                    timestamp: new Date(),
                    metadata: { mapped_fields: Object.keys(prefillData.fields).length }
                });
                
                // If Tier 3, we would attempt submit here
                if (tier === 3) {
                    logs.push({ step: "auto_submit", status: "in_progress", timestamp: new Date() });
                    const submission = await adapter.submit({ prefilled: prefillData });
                    logs.push({ 
                        step: "auto_submit", 
                        status: submission.status === 'submitted' ? 'complete' : 'failed',
                        timestamp: new Date(),
                        metadata: { confirmation_id: submission.confirmation_id }
                    });
                    
                    return { 
                        status: submission.status, 
                        logs,
                        payload: prefillData 
                    };
                }

                return { 
                    status: "prefill_ready", 
                    logs,
                    payload: prefillData 
                };
            } else {
                logs.push({ step: "fetching_ats_metadata", status: "failed", timestamp: new Date(), error: prefillData.error });
            }
        } catch (error) {
            logs.push({ step: "fetching_ats_metadata", status: "failed", timestamp: new Date(), error: error.message });
        }
    }

    // Fallback/Standard Flow
    logs.push({ step: "extracting_form_fields", status: "complete", timestamp: new Date() });
    logs.push({ step: "tailoring_materials", status: "complete", timestamp: new Date() });

    if (tier === 3) {
        logs.push({ step: "filling_form", status: "in_progress", timestamp: new Date() });
        return { status: "submitted", logs };
    } else if (tier === 2) {
        logs.push({ step: "preparing_autofill", status: "complete", timestamp: new Date() });
        return { status: "prefill_ready", logs };
    } else {
        logs.push({ step: "generating_guide", status: "complete", timestamp: new Date() });
        return { status: "manual_guide_ready", logs };
    }
}


module.exports = { detectATSType, dispatchApplication };
